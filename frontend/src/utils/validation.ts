/**
 * Frontend validation utilities that mirror backend validation rules
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (matches backend requirements)
export const isValidPassword = (password: string): boolean => {
  if (password.length < 8) return false;
  
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  return hasLowercase && hasUppercase && hasNumber;
};

// Name validation (only letters and spaces, matches backend)
export const isValidName = (name: string): boolean => {
  if (!name || name.trim().length === 0) return false;
  const nameRegex = /^[a-zA-Z\s]+$/;
  return nameRegex.test(name.trim());
};

// Username validation
export const isValidUsername = (username: string): boolean => {
  if (!username || username.trim().length < 3) return false;
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  return usernameRegex.test(username);
};

// Registration form validation
export const validateRegistrationForm = (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  username?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // First Name validation
  if (!data.firstName || !data.firstName.trim()) {
    errors.push({ field: 'firstName', message: 'Il nome è obbligatorio' });
  } else if (!isValidName(data.firstName)) {
    errors.push({ field: 'firstName', message: 'Il nome può contenere solo lettere e spazi' });
  }

  // Last Name validation
  if (!data.lastName || !data.lastName.trim()) {
    errors.push({ field: 'lastName', message: 'Il cognome è obbligatorio' });
  } else if (!isValidName(data.lastName)) {
    errors.push({ field: 'lastName', message: 'Il cognome può contenere solo lettere e spazi' });
  }

  // Email validation
  if (!data.email || !data.email.trim()) {
    errors.push({ field: 'email', message: 'L\'email è obbligatoria' });
  } else if (!isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Inserisci un\'email valida' });
  }

  // Password validation
  if (!data.password) {
    errors.push({ field: 'password', message: 'La password è obbligatoria' });
  } else if (!isValidPassword(data.password)) {
    errors.push({ 
      field: 'password', 
      message: 'La password deve contenere almeno 8 caratteri, una lettera maiuscola, una minuscola e un numero' 
    });
  }

  // Confirm password validation
  if (data.password !== data.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Le password non coincidono' });
  }

  // Username validation (if provided)
  if (data.username && !isValidUsername(data.username)) {
    errors.push({ field: 'username', message: 'Username non valido' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Login form validation
export const validateLoginForm = (data: {
  email: string;
  password: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!data.email || !data.email.trim()) {
    errors.push({ field: 'email', message: 'L\'email è obbligatoria' });
  } else if (!isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Inserisci un\'email valida' });
  }

  if (!data.password || !data.password.trim()) {
    errors.push({ field: 'password', message: 'La password è obbligatoria' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};