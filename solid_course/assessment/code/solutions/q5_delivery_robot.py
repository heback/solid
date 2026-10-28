"""Q5 정답 코드(교사용): 역할 인터페이스 분리(ISP) + 경로 계획기 주입(DIP) (Python 3.12+)

공개 테스트(문제와 동일) 4개 + 채점용 추가 케이스(answers.html에만 공개)를 assert로 확인한다.

실행: python3 q5_delivery_robot.py   -> 마지막 줄 "Q5 정답 코드: 모든 assert 통과"
"""
from abc import ABC, abstractmethod


# ---- ISP: 쓰는 쪽(Dispatcher)이 필요로 하는 역할 단위로 쪼갠 인터페이스 ----
class Courier(ABC):
    """모든 배달 로봇의 공통 역할: 이동하고 보관함을 연다."""
    def __init__(self):
        self.log = []

    @abstractmethod
    def drive_to(self, place): ...

    @abstractmethod
    def open_locker(self): ...


class ElevatorUser(ABC):
    """승강기를 탈 수 있는 로봇만 갖는 역할."""
    @abstractmethod
    def ride_elevator(self, floor): ...


class SidewalkRobot(Courier):                      # 못 하는 일은 아예 약속하지 않는다
    def drive_to(self, place):
        self.log.append(f"이동:{place}")

    def open_locker(self):
        self.log.append("보관함 열림")


class BuildingRobot(Courier, ElevatorUser):        # 두 역할을 모두 구현
    def drive_to(self, place):
        self.log.append(f"이동:{place}")

    def open_locker(self):
        self.log.append("보관함 열림")

    def ride_elevator(self, floor):
        self.log.append(f"승강기:{floor}층")


# ---- DIP: 상위 정책(Dispatcher)과 하위 세부(GpsMap)가 모두 추상화에 의존 ----
class RoutePlanner(ABC):
    @abstractmethod
    def route(self, start, goal) -> list[str]: ...


class GpsMap(RoutePlanner):
    def route(self, start, goal):
        return [start, "중앙광장", goal]


class Dispatcher:
    def __init__(self, planner: RoutePlanner):     # 구체 지도 클래스를 직접 만들지 않고 주입받는다
        self.planner = planner

    def deliver(self, robot: Courier, start, goal, floor=None):
        if floor is not None and not isinstance(robot, ElevatorUser):   # 역할(추상) 확인은 허용
            raise ValueError("이 로봇은 승강기를 탈 수 없어 층 배달을 맡을 수 없다")
        for place in self.planner.route(start, goal):
            robot.drive_to(place)
        if floor is not None:
            robot.ride_elevator(floor)
        robot.open_locker()
        return robot.log


# ===================== 공개 테스트 (수정 금지) =====================
def _check(name, fn):
    try:
        fn()
        print(f"[통과] {name}")
        return True
    except Exception as e:  # 실패해도 다음 테스트를 계속 실행
        print(f"[실패] {name} -> {type(e).__name__}: {e}")
        return False


def t1_roles():
    assert issubclass(SidewalkRobot, Courier) and issubclass(BuildingRobot, Courier)
    assert issubclass(BuildingRobot, ElevatorUser)
    assert not issubclass(SidewalkRobot, ElevatorUser), "인도 로봇이 승강기 역할을 떠안고 있음"
    assert not hasattr(SidewalkRobot(), "ride_elevator"), "인도 로봇에 쓸 수 없는 메서드가 남아 있음"


def t2_injected_planner():
    class FakePlanner(RoutePlanner):            # 테스트용 가짜 경로 계획기
        def route(self, start, goal):
            return [start, goal]
    log = Dispatcher(FakePlanner()).deliver(SidewalkRobot(), "정문", "도서관 앞")
    assert log == ["이동:정문", "이동:도서관 앞", "보관함 열림"], log


def t3_building_with_floor():
    log = Dispatcher(GpsMap()).deliver(BuildingRobot(), "기숙사", "공학관", floor=4)
    assert log == ["이동:기숙사", "이동:중앙광장", "이동:공학관", "승강기:4층", "보관함 열림"], log


def t4_refuse_before_moving():
    robot = SidewalkRobot()
    try:
        Dispatcher(GpsMap()).deliver(robot, "정문", "공학관", floor=3)
    except ValueError:
        assert robot.log == [], "거절하기 전에 이미 움직였음"
        return
    raise AssertionError("승강기를 못 타는 로봇에 층 배달을 맡겼는데 ValueError가 없음")


if __name__ == "__main__":
    print("현재 동작:", Dispatcher(GpsMap()).deliver(BuildingRobot(), "기숙사", "공학관", floor=4))
    tests = [("역할 인터페이스 분리", t1_roles), ("경로 계획기 주입", t2_injected_planner),
             ("건물 로봇 층 배달", t3_building_with_floor), ("못 하는 일은 출발 전 거절", t4_refuse_before_moving)]
    passed = sum(_check(n, f) for n, f in tests)
    print(f"공개 테스트 {passed}/{len(tests)} 통과")
    assert passed == len(tests)

    # ---- 채점용 추가 케이스(학생 비공개) ----
    import inspect
    # 1) 테스트가 새로 만든 로봇 종류(드론형 건물 로봇)도 Dispatcher 수정 없이 동작해야 함
    class RoofDrone(ElevatorUser, Courier):    # 이 순서면 ElevatorUser(Courier) 구조(허용 해법)에서도 MRO 오류 없음
        def __init__(self):
            self.log = []                          # log를 각 로봇에서 준비하는 허용 해법에서도 동작
        def drive_to(self, place): self.log.append(f"비행:{place}")
        def open_locker(self): self.log.append("투하")
        def ride_elevator(self, floor): self.log.append(f"옥상→{floor}층")
    class OnePlanner(RoutePlanner):
        def route(self, start, goal): return [goal]
    assert Dispatcher(OnePlanner()).deliver(RoofDrone(), "a", "b", floor=2) == ["비행:b", "옥상→2층", "투하"]
    # 2) 층 없는 배달은 건물 로봇도 승강기를 타지 않음
    assert Dispatcher(OnePlanner()).deliver(BuildingRobot(), "a", "b") == ["이동:b", "보관함 열림"]
    # 3) floor=0(지하/로비 등)도 '층 지정'으로 취급(falsy 함정)
    assert Dispatcher(OnePlanner()).deliver(BuildingRobot(), "a", "b", floor=0) == ["이동:b", "승강기:0층", "보관함 열림"]
    # 4) 역할 인터페이스는 추상이어야 함
    assert inspect.isabstract(Courier) and inspect.isabstract(ElevatorUser) and inspect.isabstract(RoutePlanner)
    # 5) 우회 오답 탐지: Dispatcher가 구체 클래스 이름을 알면 안 됨
    disp_src = inspect.getsource(Dispatcher)
    for banned in ("GpsMap", "SidewalkRobot", "BuildingRobot", "hasattr", "NotImplementedError"):
        assert banned not in disp_src, banned
    print("Q5 정답 코드: 모든 assert 통과")
