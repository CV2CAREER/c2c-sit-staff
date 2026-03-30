import moment from "moment";

export const ButtonProperties = {
  SIZES: {
    small: 'small',
    medium: 'medium',
    big: 'big',
    full: 'full',
  },
  ICON_POSITION: {
    start: 'start',
    end: 'end',
  },
  VARIANT: {
    primary: {
      name: 'primary',
    },
    secondary: {
      name: 'secondary',
    },
    custom: {
      name: 'custom',
    },
  },
};

/**
 * Separate classes with space between
 * This is used to separate a list of classes that are separated by commas to a list
 * classes that are separated by space
 * @param {string[]} classes
 * @return {string} classNames
 */
export const classNames = (...classes: string[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const errorMessages = {
  email: 'Email is not valid',
  maxChar: (num: number) =>
    `This field cannot have more than ${num} characters`,
  minChar: (num: number) => `This field must be at least ${num} characters`,
  minLowerCase: (num: number) =>
    `This field must be at least ${num} lower case character`,
  minUpperCase: (num: number) =>
    `This field must be at least ${num} upper case character`,
  minNumber: (num: number) => `This field must be at least ${num} number`,
  minSymbol: (num: number) =>
    `This field must be at least ${num} special character`,
  required: (fieldName: string) => `${fieldName} is compulsory`,
  passwordMatch: 'Passwords dont match',
  positiveInteger: 'The number must be greater than 0',
  integer: 'No decimals allowed',
};


export const changeDateFormat = (
	date: Date | undefined,
	timeFormat: string
) => {
	if (date) {
		return moment(date).format(timeFormat);
	}
};