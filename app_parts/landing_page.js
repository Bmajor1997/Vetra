const form = document.querySelector("#waitlistForm");
const email = document.querySelector("#waitlistEmail");
const status = document.querySelector("#waitlistStatus");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const valid = email.validity.valid;
  email.setAttribute("aria-invalid", String(!valid));
  status.classList.toggle("is-error", !valid);
  if (!valid) {
    status.textContent = "Enter a valid email address to join the waitlist.";
    email.focus();
    return;
  }
  status.classList.remove("is-error");
  status.textContent = "The signup connection is being prepared. Your email has not been submitted yet.";
});
