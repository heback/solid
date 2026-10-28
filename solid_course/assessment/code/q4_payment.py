"""Q4 시작 코드: 결제 수수료와 영수증 한 줄 (Python 3.12+)

지금은 결제 수단이 문자열이고, 새 수단이 생길 때마다 PayCounter.pay 안의
if-elif를 고쳐야 한다. 문제의 요구대로 리팩터링하라.
맨 아래 공개 테스트는 수정하지 말고, 모두 [통과]가 나오게 만들어라.

실행: python3 q4_payment.py
"""


class PayCounter:
    def pay(self, amount, method):
        if method == "card":
            label, fee = "카드", amount * 2 // 100          # 결제액의 2%(원 미만 버림)
        elif method == "bank":
            label, fee = "계좌이체", 500                    # 고정 500원
        elif method == "phone":
            label, fee = "휴대폰", amount * 5 // 100        # 결제액의 5%(원 미만 버림)
        else:
            raise ValueError(f"모르는 결제 수단: {method}")
        return f"{label} 결제 {amount}원 + 수수료 {fee}원 = {amount + fee}원"


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
    print("현재 동작:", PayCounter().pay(12345, "card"))   # 리팩터링 후에는 이 줄을 지우거나 새 구조에 맞게 고친다
    tests = [("카드 수수료", t1_card), ("계좌이체·휴대폰 수수료", t2_bank_phone),
             ("추상 클래스 구조", t3_abstract), ("포인트 결제 추가", t4_point),
             ("PayCounter 수정 없이 새 수단", t5_new_method_without_edit)]
    passed = sum(_check(n, f) for n, f in tests)
    print(f"공개 테스트 {passed}/{len(tests)} 통과")
