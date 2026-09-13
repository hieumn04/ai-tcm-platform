export const truncateText = (text: string, maxLength: number) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  const words = text.split(' ');
  let truncated = '';

  for (const word of words) {
    // If adding the next word exceeds maxLength, stop adding
    if ((truncated + ' ' + word).trim().length > maxLength) break;

    truncated += (truncated ? ' ' : '') + word;
  }

  // If no words were added (i.e., first word itself was too long)
  if (!truncated) {
    truncated = text.substring(0, maxLength - 3); // Take first part of the word
  }

  return truncated + '...';
};

export const capitalizeWords = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
