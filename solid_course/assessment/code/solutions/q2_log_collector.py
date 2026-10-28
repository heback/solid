"""Q2 정답 예시 코드(교사용): 서버 로그 수집기를 SRP·DIP에 맞게 나눈 한 가지 구조 (Python 3.12+)

Q2는 분석 문항이라 학생이 코드를 제출하지 않는다. 이 파일은 (3) 서술형 '개선 구조'의
모범 예시이며, 시작 코드와 결과가 같음을 assert로 확인한다.

실행: python3 q2_log_collector.py   -> 마지막 줄 "Q2 정답 코드: 모든 assert 통과"
"""
import os
import tempfile
from abc import ABC, abstractmethod


class LogParser:
    """변경 이유: 로그 형식(수집 에이전트 팀)."""
    def parse(self, raw_text):
        entries = []
        for row in raw_text.strip().splitlines():
            level, server, message = row.split("|")
            entries.append((level.strip(), server.strip(), message.strip()))
        return entries


class LogStorage(ABC):
    """저장 위치에 대한 추상화. 상위 정책(LogPipeline)은 이것만 안다."""
    @abstractmethod
    def write(self, lines): ...


class FileLogStorage(LogStorage):
    """변경 이유: 저장 위치(인프라 팀). 파일 열기는 여기에만 있다."""
    def __init__(self, path):
        self.path = path

    def write(self, lines):
        with open(self.path, "w", encoding="utf-8") as f:
            for line in lines:
                f.write(line + "\n")


class MemoryLogStorage(LogStorage):
    """테스트용 저장소: 파일 없이 검증할 수 있다(DIP의 이점)."""
    def __init__(self):
        self.lines = []

    def write(self, lines):
        self.lines = list(lines)


class SummaryFormatter:
    """변경 이유: 회의용 요약 문장 형식(운영팀)."""
    def format(self, errors):
        servers = sorted({server for _, server, _ in errors})
        return f"오류 {len(errors)}건 / 서버 {', '.join(servers)}"


class LogPipeline:
    """조립·흐름만 담당. 구체 저장소를 직접 만들지 않고 주입받는다."""
    def __init__(self, parser: LogParser, storage: LogStorage, formatter: SummaryFormatter):
        self.parser, self.storage, self.formatter = parser, storage, formatter
        self.entries = []

    def collect(self, raw_text):
        self.entries.extend(self.parser.parse(raw_text))

    def errors(self):
        return [e for e in self.entries if e[0] == "ERROR"]

    def save(self):
        self.storage.write(f"{server}: {message}" for _, server, message in self.errors())

    def summary(self):
        return self.formatter.format(self.errors())


RAW = """
INFO|web-1|요청 처리 완료
ERROR|db-2|연결 시간 초과
ERROR|web-1|응답 코드 500
WARN|web-2|느린 응답
ERROR|db-2|디스크 부족
"""

if __name__ == "__main__":
    # 1) 메모리 저장소로 파일 없이 검증
    mem = MemoryLogStorage()
    p = LogPipeline(LogParser(), mem, SummaryFormatter())
    p.collect(RAW)
    p.save()
    assert p.summary() == "오류 3건 / 서버 db-2, web-1"
    assert mem.lines == ["db-2: 연결 시간 초과", "web-1: 응답 코드 500", "db-2: 디스크 부족"]

    # 2) 파일 저장소로 바꿔도 LogPipeline은 그대로 — 시작 코드와 같은 파일 내용
    out = os.path.join(tempfile.gettempdir(), "q2_errors_solution.txt")
    p2 = LogPipeline(LogParser(), FileLogStorage(out), SummaryFormatter())
    p2.collect(RAW)
    p2.save()
    with open(out, encoding="utf-8") as f:
        assert f.read() == "db-2: 연결 시간 초과\nweb-1: 응답 코드 500\ndb-2: 디스크 부족\n"

    # 3) 시작 코드와 결과 비교
    import importlib.util, pathlib
    spec = importlib.util.spec_from_file_location(
        "q2_start", pathlib.Path(__file__).resolve().parent.parent / "q2_log_collector.py")
    start = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(start)
    old = start.ServerLogCollector(os.path.join(tempfile.gettempdir(), "q2_errors_old.txt"))
    old.collect(RAW)
    assert old.summary() == p.summary()

    # 4) 상위 정책이 구체 저장소를 직접 만들지 않는지(구조 점검)
    import inspect
    src = inspect.getsource(LogPipeline)
    assert "open(" not in src and "FileLogStorage" not in src
    print("Q2 정답 코드: 모든 assert 통과")
