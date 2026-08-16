export const blankGame = () => ({
  gameName: '',
  drawNumber: '',
  winningNumbers: '',
});

export const blankFile = () => ({
  fileName: '',
});

export const getIPv4Error = (value) => {
  if (!value) {
    return '';
  }

  if (!/^[\d.]+$/.test(value)) {
    return 'Use only numbers and periods in an IPv4 address.';
  }

  const octets = value.split('.');

  if (octets.length > 4) {
    return 'An IPv4 address can contain only four sections.';
  }

  if (octets.some((octet, index) =>
    !octet && index < octets.length - 1
  )) {
    return 'Each IPv4 address section must contain a number.';
  }

  for (const octet of octets) {
    if (!octet) {
      continue;
    }

    if (octet.length > 3 || Number(octet) > 255) {
      return 'Each IPv4 address section must be between 0 and 255.';
    }
  }

  if (octets.length !== 4 || !octets[3]) {
    return 'Enter a complete IPv4 address.';
  }

  return '';
};
