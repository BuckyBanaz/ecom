export function cleanAndValidatePhone(code: string, number: string): { isValid: boolean; cleanedNumber: string; fullPhone: string } {
  // Strip all non-digit characters
  let cleaned = number.replace(/\D/g, '');
  
  // Strip leading zero if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  
  let isValid = false;
  if (code === "+31") {
    // Dutch numbers (excluding +31 and leading 0) must have exactly 9 digits
    isValid = cleaned.length === 9;
  } else if (code === "+91") {
    // Indian numbers (excluding +91 and leading 0) must have exactly 10 digits
    isValid = cleaned.length === 10;
  } else {
    // Fallback validation for other countries
    isValid = cleaned.length >= 7 && cleaned.length <= 15;
  }
  
  return {
    isValid,
    cleanedNumber: cleaned,
    fullPhone: `${code}${cleaned}`
  };
}

export function parseAndValidateFullPhone(fullPhone: string): { isValid: boolean; code: string; cleanedNumber: string; cleanedFullPhone: string } {
  if (!fullPhone) {
    return { isValid: false, code: "+31", cleanedNumber: "", cleanedFullPhone: "" };
  }
  
  let code = "+31";
  let rest = fullPhone;
  
  if (fullPhone.startsWith("+31")) {
    code = "+31";
    rest = fullPhone.slice(3);
  } else if (fullPhone.startsWith("+91")) {
    code = "+91";
    rest = fullPhone.slice(3);
  } else if (fullPhone.startsWith("+1")) {
    code = "+1";
    rest = fullPhone.slice(2);
  } else if (fullPhone.startsWith("+44")) {
    code = "+44";
    rest = fullPhone.slice(3);
  }
  
  const validation = cleanAndValidatePhone(code, rest);
  return {
    isValid: validation.isValid,
    code,
    cleanedNumber: validation.cleanedNumber,
    cleanedFullPhone: validation.fullPhone
  };
}
