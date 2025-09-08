// --- Stats (unchanged) ---
const venues = 142;   // update dynamically later
const users  = 823;   // update dynamically later

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

// Kick off counters
window.addEventListener("DOMContentLoaded", () => {
  animateCounter("usersCount", users);
  animateCounter("venuesCount", venues);
  // Safe if these extra ids exist on the page:
  animateCounter("venue-count", venues);
  animateCounter("user-count", users);
});

// --- Waitlist form -> backend ---
window.addEventListener("DOMContentLoaded", () => {
  const form      = document.getElementById("waitlist-form");
  const success   = document.getElementById("success");
  const shareLink = document.getElementById("share-link");
  const copyBtn   = document.getElementById("copy-btn");
  const queueCopy = document.getElementById("queue-copy");
  const API       = "/api/subscribe"; // same Vercel project → relative path

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
          source: "waitlist"
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Request failed");

      const inserted       = !!data.inserted;
      const alreadyExisted = !!data.alreadyExisted;

      // UI (same look/feel)
      const ref = Math.random().toString(36).substring(2, 8);
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
