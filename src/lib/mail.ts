import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { buildReportHtml, buildResultsWorkbook, getPendingResultsForUser } from "@/lib/report";
import { getTodayDateLabel } from "@/lib/format";

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM ?? user;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    from,
  };
}

export async function sendPendingReport(userId: string) {
  const [user, recipients, results] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    }),
    prisma.recipient.findMany({
      where: {
        userId,
        active: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    getPendingResultsForUser(userId),
  ]);

  if (!user) {
    return { success: false, message: "사용자 정보를 찾을 수 없습니다.", sentCount: 0 };
  }

  if (recipients.length === 0) {
    return { success: false, message: "활성 수신자가 없습니다.", sentCount: 0 };
  }

  if (results.length === 0) {
    return { success: false, message: "발송할 신규 공고가 없습니다.", sentCount: 0 };
  }

  const config = getMailConfig();
  if (!config) {
    await prisma.mailHistory.createMany({
      data: recipients.map((recipient) => ({
        userId,
        recipient: recipient.email,
        subject: `[G2B] ${getTodayDateLabel()} 신규 공고 ${results.length}건`,
        status: "skipped",
        errorMessage: "SMTP 설정이 없어 실제 발송을 건너뛰었습니다.",
      })),
    });

    return {
      success: false,
      message: "SMTP 설정이 없어 실제 발송은 건너뛰고 이력만 남겼습니다.",
      sentCount: 0,
    };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const workbook = await buildResultsWorkbook(userId);
  const subject = `[G2B] ${getTodayDateLabel()} 신규 공고 ${results.length}건`;
  const html = buildReportHtml({
    userName: user.name ?? user.email,
    results,
  });

  let sentCount = 0;

  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from: config.from,
        to: recipient.email,
        subject,
        html,
        attachments: [
          {
            filename: workbook.fileName,
            content: workbook.buffer,
          },
        ],
      });

      sentCount += 1;

      await prisma.mailHistory.create({
        data: {
          userId,
          recipient: recipient.email,
          subject,
          status: "sent",
        },
      });
    } catch (error) {
      await prisma.mailHistory.create({
        data: {
          userId,
          recipient: recipient.email,
          subject,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "알 수 없는 발송 오류",
        },
      });
    }
  }

  if (sentCount > 0) {
    await prisma.collectedResult.updateMany({
      where: {
        id: {
          in: results.map((item) => item.id),
        },
      },
      data: {
        emailedAt: new Date(),
        status: "emailed",
      },
    });
  }

  return {
    success: sentCount > 0,
    message:
      sentCount > 0
        ? `${sentCount}개 수신자에게 메일을 발송했습니다.`
        : "메일 발송에 실패했습니다. 이력을 확인해주세요.",
    sentCount,
  };
}
