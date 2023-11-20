
// Function to toggle password visibility for a specific field
function togglePasswordVisibility(passwordFieldId, checkboxId) {
  const passwordField = document.getElementById(passwordFieldId);
  const checkbox = document.getElementById(checkboxId);

  if (passwordField.type === 'password') {
    passwordField.type = 'text';
  } else {
    passwordField.type = 'password';
  }

  // Update the checkbox label accordingly
  checkbox.checked = passwordField.type === 'text';
}

