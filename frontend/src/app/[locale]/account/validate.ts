function isValidEmail(email: string) {
  const validRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validRegex.test(email);
}

function isValidPassword(password: string) {
  if (password.length > 7) {
    return true;
  } else {
    return false;
  }
}

export { isValidEmail, isValidPassword };
