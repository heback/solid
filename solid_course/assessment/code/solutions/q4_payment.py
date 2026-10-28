"""Q4 정답 코드(교사용): 결제 수단을 추상화해 OCP를 지키는 구조 (Python 3.12+)

공개 테스트(문제와 동일) 5개 + 채점용 추가 케이스(answers.html에만 공개)를 assert로 확인한다.

실행: python3 q4_payment.py   -> 마지막 줄 "Q4 정답 코드: 모든 assert 통과"
"""
from abc import ABC, abstractmethod


class PaymentMethod(ABC):
    """결제 수단의 약속: label(표시 이름, str)과 fee(amount) -> 0 이상의 int 수수료."""
    label: str = ""

    @abstractmethod
    def fee(self, amount: int) -> int: ...


class CardPayment(PaymentMethod):
    label = "카드"
    def fee(self, amount):
        return amount * 2 // 100


class BankTransfer(PaymentMethod):
    label = "계좌이체"
    def fee(self, amount):
        return 500


class PhonePayment(PaymentMethod):
    label = "휴대폰"
    def fee(self, amount):
        return amount * 5 // 100


class PointPayment(PaymentMethod):          # (2) 새 수단: 기존 클래스는 한 줄도 고치지 않고 추가만
    label = "포인트"
    def fee(self, amount):
        return max(100, amount // 100)      # 결제액의 1%(원 미만 버림), 최소 100원


class PayCounter:
    """결제 수단의 구체 타입을 모른다. 추상화(PaymentMethod)의 약속만 사용."""
    def pay(self, amount: int, method: PaymentMethod) -> str:
        fee = method.fee(amount)
        return f"{method.label} 결제 {amount}원 + 수수료 {fee}원 = {amount + fee}원"


# ===================== 공개 테스트 (수정 금지) =====================
def _check(name, fn):
    try:
        fn()
        print(f"[통과] {name}")
        return True
    except Exception as e:  # 실패해도 다음 테스트를 계속 실행
        print(f"[실패] {name} -> {type(e).__name__}: {e}")
        return False


def t1_card():
    assert PayCounter().pay(12345, CardPayment()) == "카드 결제 12345원 + 수수료 246원 = 12591원"


def t2_bank_phone():
    assert PayCounter().pay(3000, BankTransfer()) == "계좌이체 결제 3000원 + 수수료 500원 = 3500원"
    assert PayCounter().pay(999, PhonePayment()) == "휴대폰 결제 999원 + 수수료 49원 = 1048원"


def t3_abstract():
    import inspect
    assert inspect.isabstract(PaymentMethod), "PaymentMethod는 추상 클래스여야 함"
    for cls in (CardPayment, BankTransfer, PhonePayment):
        assert issubclass(cls, PaymentMethod), f"{cls.__name__}가 PaymentMethod를 상속하지 않음"


def t4_point():
    assert PayCounter().pay(5000, PointPayment()) == "포인트 결제 5000원 + 수수료 100원 = 5100원"
    assert PayCounter().pay(25000, PointPayment()) == "포인트 결제 25000원 + 수수료 250원 = 25250원"


def t5_new_method_without_edit():
    # 테스트가 즉석에서 만든 새 결제 수단. PayCounter를 고치지 않고도 동작해야 한다.
    class GiftCard(PaymentMethod):
        label = "상품권"
        def fee(self, amount):
            return 0
    assert PayCounter().pay(7000, GiftCard()) == "상품권 결제 7000원 + 수수료 0원 = 7000원"


if __name__ == "__main__":
    tests = [("카드 수수료", t1_card), ("계좌이체·휴대폰 수수료", t2_bank_phone),
             ("추상 클래스 구조", t3_abstract), ("포인트 결제 추가", t4_point),
             ("PayCounter 수정 없이 새 수단", t5_new_method_without_edit)]
    passed = sum(_check(n, f) for n, f in tests)
    print(f"공개 테스트 {passed}/{len(tests)} 통과")
    assert passed == len(tests)

    # ---- 채점용 추가 케이스(학생 비공개) ----
    import inspect
    pc = PayCounter()
    assert pc.pay(10000, PointPayment()) == "포인트 결제 10000원 + 수수료 100원 = 10100원"   # 1% = 최소값 경계
    assert pc.pay(10099, PointPayment()) == "포인트 결제 10099원 + 수수료 100원 = 10199원"   # 버림
    assert pc.pay(10100, PointPayment()) == "포인트 결제 10100원 + 수수료 101원 = 10201원"
    assert pc.pay(0, CardPayment()) == "카드 결제 0원 + 수수료 0원 = 0원"
    assert pc.pay(49, CardPayment()) == "카드 결제 49원 + 수수료 0원 = 49원"
    assert pc.pay(1, BankTransfer()) == "계좌이체 결제 1원 + 수수료 500원 = 501원"

    # property로 label을 준 새 수단도 동작(허용 해법 범위 확인)
    class Crypto(PaymentMethod):
        @property
        def label(self):
            return "코인"
        def fee(self, amount):
            return 300
    assert pc.pay(100, Crypto()) == "코인 결제 100원 + 수수료 300원 = 400원"

    # 추상 메서드를 빼먹은 하위 클래스는 만들 수 없어야 함
    class Broken(PaymentMethod):
        label = "x"
    try:
        Broken()
        raise AssertionError("fee 없는 하위 클래스가 만들어짐")
    except TypeError:
        pass

    # 우회 오답 탐지: PayCounter.pay 안에 구체 타입 분기·라벨 하드코딩이 없어야 함
    pay_src = inspect.getsource(PayCounter.pay)
    for banned in ("isinstance", "type(", "CardPayment", "BankTransfer", "PhonePayment", "PointPayment", "elif"):
        assert banned not in pay_src, banned
    print("Q4 정답 코드: 모든 assert 통과")
