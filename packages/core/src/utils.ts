/**
 * Entero al azar entre min y max, ambos incluidos. Usa Math.random: sirve para datos
 * sintéticos de prueba, no para valores de seguridad.
 */
export function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Elemento al azar de un arreglo no vacío. */
export function randomItem<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)] as T;
}

/** Cadena de `length` dígitos al azar; `nonZeroFirst` evita el cero inicial. */
export function randomDigits(length: number, nonZeroFirst = false): string {
  let digits = '';
  for (let i = 0; i < length; i++) {
    digits += String(randomInt(i === 0 && nonZeroFirst ? 1 : 0, 9));
  }
  return digits;
}

/** Suma ponderada: un peso por dígito, de izquierda a derecha. */
export function weightedSum(digits: string, weights: readonly number[]): number {
  let sum = 0;
  weights.forEach((weight, i) => {
    sum += Number(digits.charAt(i)) * weight;
  });
  return sum;
}

/** Enteros de `from` a `to` (incluidos), en orden ascendente o descendente. */
export function range(from: number, to: number): number[] {
  const step = from <= to ? 1 : -1;
  const out: number[] = [];
  for (let n = from; step > 0 ? n <= to : n >= to; n += step) {
    out.push(n);
  }
  return out;
}

/** La fecha existe en el calendario gregoriano. */
export function isValidDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] as number;
  return day <= days;
}

/** Rellena con ceros a la izquierda. */
export function zeroPad(n: number, length: number): string {
  return String(n).padStart(length, '0');
}

/** Entero a partir de una subcadena de dígitos. */
export function int(s: string): number {
  return Number.parseInt(s, 10);
}
