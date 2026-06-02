import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import {
  buildReportHtml,
  buildResultsWorkbookFromResults,
  getDailyReportResultsForUser,
} from "@/lib/report";
import { getDailyReportWindow } from "@/lib/report-window";

export function getMailConfig() {
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

function createMailTransporter(config: NonNullable<ReturnType<typeof getMailConfig>>) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
}

export async function sendEmailVerificationCode(input: {
  email: string;
  code: string;
  expiresMinutes: number;
}) {
  const config = getMailConfig();
  if (!config) {
    return { sent: false };
  }

  const transporter = createMailTransporter(config);

  await transporter.sendMail({
    from: config.from,
    to: input.email,
    subject: "[G2B] 이메일 인증번호",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>G2B Bid Report 이메일 인증</h2>
        <p>아래 인증번호를 앱에 입력해주세요.</p>
        <p style="font-size:28px;font-weight:800;letter-spacing:4px">${input.code}</p>
        <p>이 번호는 ${input.expiresMinutes}분 동안만 사용할 수 있습니다.</p>
      </div>
    `,
  });

  return { sent: true };
}

export async function sendPasswordResetLink(input: {
  email: string;
  resetUrl: string;
  expiresMinutes: number;
}) {
  const config = getMailConfig();
  if (!config) {
    return { sent: false };
  }

  const transporter = createMailTransporter(config);

  await transporter.sendMail({
    from: config.from,
    to: input.email,
    subject: "[G2B] 비밀번호 재설정",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>G2B Bid Report 비밀번호 재설정</h2>
        <p>아래 버튼을 눌러 새 비밀번호를 설정해주세요.</p>
        <p><a href="${input.resetUrl}" style="display:inline-block;padding:10px 14px;background:#bd93f9;color:#0f111a;text-decoration:none;border-radius:6px;font-weight:700">비밀번호 재설정</a></p>
        <p>이 링크는 ${input.expiresMinutes}분 동안만 사용할 수 있습니다.</p>
      </div>
    `,
  });

  return { sent: true };
}

export async function sendAccountLookupEmail(input: {
  email: string;
  accountEmail: string;
}) {
  const config = getMailConfig();
  if (!config) {
    return { sent: false };
  }

  const transporter = createMailTransporter(config);

  await transporter.sendMail({
    from: config.from,
    to: input.email,
    subject: "[G2B] 계정 안내",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>G2B Bid Report 계정 안내</h2>
        <p>요청하신 계정 이메일은 다음과 같습니다.</p>
        <p style="font-size:18px;font-weight:800">${input.accountEmail}</p>
        <p>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
      </div>
    `,
  });

  return { sent: true };
}

async function getUserReportSchedule(
  userId: string,
  options?: { timezone?: string; sendTime?: string },
) {
  if (options?.timezone && options.sendTime) {
    return {
      timezone: options.timezone,
      sendTime: options.sendTime,
    };
  }

  const schedule = await prisma.scheduleSetting.findFirst({
    where: {
      userId,
      active: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      timezone: true,
      sendTime: true,
    },
  });

  return {
    timezone: options?.timezone ?? schedule?.timezone ?? "Asia/Seoul",
    sendTime: options?.sendTime ?? schedule?.sendTime ?? "09:00",
  };
}

export async function sendPendingReport(
  userId: string,
  options?: { timezone?: string; sendTime?: string; now?: Date },
) {
  const schedule = await getUserReportSchedule(userId, options);
  const reportWindow = getDailyReportWindow({
    timezone: schedule.timezone,
    sendTime: schedule.sendTime,
    now: options?.now,
  });
  const subjectPrefix = `[G2B] ${reportWindow.label} 일일 공고 `;

  const [user, recipients, results, sentMailHistories] = await Promise.all([
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
    getDailyReportResultsForUser(userId, reportWindow),
    prisma.mailHistory.findMany({
      where: {
        userId,
        status: "sent",
        subject: {
          startsWith: subjectPrefix,
        },
        sentAt: {
          gte: reportWindow.end,
        },
      },
      select: {
        recipient: true,
      },
    }),
  ]);

  if (!user) {
    return { success: false, message: "사용자 정보를 찾을 수 없습니다.", sentCount: 0 };
  }

  if (recipients.length === 0) {
    return { success: false, message: "활성 수신자가 없습니다.", sentCount: 0 };
  }

  const sentRecipientEmails = new Set(
    sentMailHistories.map((history) => history.recipient.toLowerCase()),
  );
  const pendingRecipients = recipients.filter(
    (recipient) => !sentRecipientEmails.has(recipient.email.toLowerCase()),
  );
  const alreadySentCount = recipients.length - pendingRecipients.length;

  if (pendingRecipients.length === 0) {
    return {
      success: true,
      message: `${reportWindow.label} 일일 리포트는 활성 수신자 ${recipients.length}명에게 이미 발송됐습니다.`,
      sentCount: 0,
    };
  }

  if (results.length === 0) {
    return {
      success: false,
      message: `${reportWindow.label} 일일 리포트로 발송할 확인 공고가 없습니다.`,
      sentCount: 0,
    };
  }

  const subject = `${subjectPrefix}${results.length}건`;

  const config = getMailConfig();
  if (!config) {
    await prisma.mailHistory.createMany({
      data: pendingRecipients.map((recipient) => ({
        userId,
        recipient: recipient.email,
        subject,
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

  const transporter = createMailTransporter(config);

  const workbook = buildResultsWorkbookFromResults(results);
  const html = buildReportHtml({
    userName: user.name ?? user.email,
    results,
    title: "나라장터 일일 공고 리포트",
    summary: `${user.name ?? user.email}님 기준 ${reportWindow.label} ${schedule.sendTime} 발송 대상 공고 ${results.length}건입니다.`,
  });

  let sentCount = 0;

  for (const recipient of pendingRecipients) {
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

  const allPendingRecipientsSent = sentCount === pendingRecipients.length;
  const allActiveRecipientsCovered = alreadySentCount + sentCount === recipients.length;

  if (allPendingRecipientsSent && allActiveRecipientsCovered) {
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

  const successMessage =
    alreadySentCount > 0
      ? `${sentCount}개 수신자에게 메일을 발송했습니다. 이미 발송된 ${alreadySentCount}명은 건너뛰었습니다.`
      : `${sentCount}개 수신자에게 메일을 발송했습니다.`;
  const partialMessage =
    alreadySentCount > 0
      ? `${sentCount}/${pendingRecipients.length}명에게만 발송됐습니다. 이미 발송된 ${alreadySentCount}명은 건너뛰었고, 미발송 공고는 그대로 두었습니다.`
      : `${sentCount}/${pendingRecipients.length}명에게만 발송됐습니다. 미발송 공고는 그대로 두었으니 설정·이력을 확인한 뒤 다시 발송해주세요.`;

  return {
    success: allPendingRecipientsSent,
    message: allPendingRecipientsSent
      ? successMessage
      : sentCount > 0
        ? partialMessage
        : "메일 발송에 실패했습니다. 이력을 확인해주세요.",
    sentCount,
  };
}
