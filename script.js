// Fake stats for demo
const venues = 142;   // update dynamically later
const users = 823;    // update dynamically later

// Animate counters
function animateCounter(id, target) {
  const el = document.getElementById(id);
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

// Corrected order
window.addEventListener('DOMContentLoaded', () => {
  animateCounter("usersCount", 142);   // Users
  animateCounter("venuesCount", 823);  // Venues
});

window.addEventListener("DOMContentLoaded", () => {
  animateCounter("venue-count", venues);
  animateCounter("user-count", users);

  // Waitlist logic
  const form = document.getElementById("waitlist-form");
  const success = document.getElementById("success");
  const shareLink = document.getElementById("share-link");
  const copyBtn = document.getElementById("copy-btn");
  const queueCopy = document.getElementById("queue-copy");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const name = document.getElementById("name").value;
    const city = document.getElementById("city").value;

    if (!email) {
      alert("Please enter an email.");
      return;
    }

    // === NEW: Send to backend API ===
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "waitlist", cityPreference: city })
      });
      const data = await res.json();
      console.log("API response:", data);
    } catch (err) {
      console.error("Error saving to backend:", err);
    }

    // Frontend UI updates (unchanged)
    const ref = Math.random().toString(36).substring(2, 8);
    form.classList.add("hidden");
    success.classList.remove("hidden");
    queueCopy.textContent = `You’re on the list, ${name || "friend"}! Share your link to climb the waitlist.`;
    shareLink.value = `${window.location.origin}?ref=${ref}`;
  });

  copyBtn?.addEventListener("click", () => {
    shareLink.select();
    document.execCommand("copy");
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy link"), 1500);
  });
});
