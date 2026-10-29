import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig, TEACHER_EMAILS } from "./firebase-config.js";

export const DOMAIN = "@ts.hs.kr";
export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fmtDate = t => t?.toDate ? t.toDate().toLocaleString("ko-KR", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
export const millis = t => t?.toMillis ? t.toMillis() : 0;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const call = (name, timeout = 60000) => httpsCallable(getFunctions(app, "asia-northeast3"), name, { timeout });
export const isTeacher = user => !!user && TEACHER_EMAILS.includes((user.email || "").toLowerCase());

// 로그인 화면(#login)과 앱 화면(#app)을 전환한다. onUser(user|null)는 로그인·로그아웃 때마다 불린다.
export function start(onUser) {
  $("#loginBtn").onclick = async () => {
    $("#loginMsg").textContent = "";
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: "ts.hs.kr", prompt: "select_account" });
    try { await signInWithPopup(auth, provider); }
    catch (e) { if (e.code !== "auth/popup-closed-by-user") $("#loginMsg").textContent = "로그인에 실패했습니다: " + e.code; }
  };
  $("#logout").onclick = () => signOut(auth);
  onAuthStateChanged(auth, async user => {
    if (user && !(user.emailVerified && (user.email || "").toLowerCase().endsWith(DOMAIN))) {
      await signOut(auth);
      $("#loginMsg").textContent = `${DOMAIN} 계정만 사용할 수 있습니다.`;
      user = null;
    }
    $("#login").hidden = !!user;
    $("#app").hidden = !user;
    $("#user").hidden = !user;
    $("#who").textContent = user ? user.email : "";
    onUser(user);
  });
}
