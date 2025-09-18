// public/script.js

// --- Stats counters ---
const FALLBACK_USERS = 0;
const FALLBACK_VENUES = 1328;

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/stats");
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || "Bad response");

    animateCounter("usersCount", data.users || FALLBACK_USERS);
    animateCounter("venuesCount", data.venues || FALLBACK_VENUES);
    animateCounter("venue-count", data.venues || FALLBACK_VENUES);
    animateCounter("user-count", data.users || FALLBACK_USERS);
  } catch (err) {
    console.error("Failed to load stats:", err);

    // fallback
    animateCounter("usersCount", FALLBACK_USERS);
    animateCounter("venuesCount", FALLBACK_VENUES);
    animateCounter("venue-count", FALLBACK_VENUES);
    animateCounter("user-count", FALLBACK_USERS);
  }
});

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let count = 0;
  const increment = target / 100; // speed
  const interval = setInterval(() => {
    count += increment;
    if (count >= target) {
      count = target;
      clearInterval(interval);
    }
    el.textContent = Math.floor(count);
  }, 20);
}

// --- Waitlist form -> backend (with referrals) ---
window.addEventListener("DOMContentLoaded", () => {
  const form      = document.getElementById("waitlist-form");
  const success   = document.getElementById("success");
  const shareLink = document.getElementById("share-link");
  const copyBtn   = document.getElementById("copy-btn");
  const queueCopy = document.getElementById("queue-copy");
  const API       = "/api/subscribe"; // same project → relative
  const REF_FROM_URL = new URLSearchParams(location.search).get("ref") || null;

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email     = document.getElementById("email").value.trim();
    const firstName = (document.getElementById("firstName")?.value || "").trim();
    const lastName  = (document.getElementById("lastName")?.value || "").trim();
    const city      = (document.getElementById("city")?.value || "").trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!email) {
      alert("Please enter an email.");
      return;
    }
    if (!firstName || !lastName) {
      alert("Please enter your first and last name.");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          cityPreference: city,
          source: "waitlist",
          referrerCode: REF_FROM_URL || undefined
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Request failed");

      const inserted       = !!data.inserted;
      const alreadyExisted = !!data.alreadyExisted;
      const myCode         = data.referralCode || null;

      // UI (same look/feel), using *real* referral code from server:
      const ref = myCode || Math.random().toString(36).substring(2, 8);
      form.classList.add("hidden");
      success.classList.remove("hidden");
      queueCopy.textContent = inserted
        ? `You’re on the list, ${firstName}! Share your link to climb the waitlist.`
        : `You’re already on the list, ${firstName}! Share your link to climb the waitlist.`;
      shareLink.value = `${window.location.origin}?ref=${ref}`;

      console.log("Subscribe response:", data);
    } catch (err) {
      console.error("Subscribe error:", err);
      alert("Sorry, something went wrong adding you to the waitlist. Please try again.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  copyBtn?.addEventListener("click", () => {
    shareLink.select();
    document.execCommand("copy");
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy link"), 1500);
  });
});
