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
  animateCounter("venue-count", venues); // safe if those ids exist
  animateCounter("user-count", users);
});

// --- Waitlist form -> backend ---
window.addEventListener("DOMContentLoaded", () => {
  const form      = document.getElementById("waitlist-form");
  const success   = document.getElementById("success");
  const shareLink = document.getElementById("share-link");
  const copyBtn   = document.getElementById("copy-btn");
  const queueCopy = document.getElementById("queue-copy");
  const API       = "/api/subscribe"; // same project → relative path

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const name  = (document.getElementById("name")?.value || "").trim();
    const city  = (document.getElementById("city")?.value || "").trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!email) {
      alert("Please enter an email.");
      return;
    }

    submitBtn && (submitBtn.disabled = true);

    try {
      // Send to your serverless API (saves to MongoDB)
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `source` & `cityPreference` match the API you deployed
        body: JSON.stringify({ email, source: "waitlist", cityPreference: city, name })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Request failed");
      }

      // --- UI success (unchanged look/feel) ---
      const ref = Math.random().toString(36).substring(2, 8);
      form.classList.add("hidden");
      success.classList.remove("hidden");
      queueCopy.textContent = data.alreadyExisted
        ? `You’re already on the list, ${name || "friend"}! Share your link to climb the waitlist.`
        : `You’re on the list, ${name || "friend"}! Share your link to climb the waitlist.`;
      shareLink.value = `${window.location.origin}?ref=${ref}`;
    } catch (err) {
      console.error("Subscribe error:", err);
      alert("Sorry, something went wrong adding you to the waitlist. Please try again.");
    } finally {
      submitBtn && (submitBtn.disabled = false);
    }
  });

  copyBtn?.addEventListener("click", () => {
    shareLink.select();
    document.execCommand("copy");
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy link"), 1500);
  });
});
