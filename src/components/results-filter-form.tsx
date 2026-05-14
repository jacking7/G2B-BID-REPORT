type ResultsFilterFormProps = {
  initialQuery: string;
  initialStatus: string;
  initialKeyword: string;
};

export function ResultsFilterForm({
  initialQuery,
  initialStatus,
  initialKeyword,
}: ResultsFilterFormProps) {
  return (
    <form className="filterForm" method="get">
      <label className="field">
        <span>검색어</span>
        <input
          type="text"
          name="q"
          defaultValue={initialQuery}
          placeholder="공고명, 기관, 공고번호"
        />
      </label>

      <label className="field">
        <span>발송 상태</span>
        <select name="status" defaultValue={initialStatus}>
          <option value="all">전체</option>
          <option value="pending">미발송</option>
          <option value="emailed">발송완료</option>
        </select>
      </label>

      <label className="field">
        <span>매칭 키워드</span>
        <input
          type="text"
          name="keyword"
          defaultValue={initialKeyword}
          placeholder="예: AI"
        />
      </label>

      <div className="filterActions">
        <button type="submit" className="primaryButton">
          필터 적용
        </button>
        <a href="/results" className="ghostButton linkButton">
          초기화
        </a>
      </div>
    </form>
  );
}
