/**
 * Converts a UTC timestamp string to a string representation in the browser's local timezone.
 *
 * @param utcTimestamp The UTC timestamp string (e.g., "2025-07-12T06:04:59.000Z").
 * @returns A string representing the date and time in the browser's local timezone,
 * or an error message if the input is invalid.
 */
function convertUtcToBrowserLocalTime(utcTimestamp: string): string {
  try {
    // Create a Date object from the UTC timestamp string.
    // The 'Z' at the end ensures it's parsed as UTC.
    const date = new Date(utcTimestamp);

    // Check if the date object is valid.
    // Invalid date strings will result in a Date object where getTime() returns NaN.
    if (isNaN(date.getTime())) {
      throw new Error("Invalid UTC timestamp format provided.");
    }

    // Use toLocaleString to format the date and time according to the user's
    // browser locale and timezone settings.
    // We specify options for clarity, but default behavior is often sufficient.
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // Use 24-hour format
      timeZoneName: 'short', // Display the abbreviated time zone name (e.g., "AEST", "PDT")
    };

    return date.toLocaleString(undefined, options); // `undefined` uses the browser's default locale
  } catch (error: any) {
    // Return an informative error message if something goes wrong.
    return `Error converting time: ${error.message}`;
  }
}

export default convertUtcToBrowserLocalTime;