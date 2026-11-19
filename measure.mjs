import { performance } from 'node:perf_hooks';

async function main() {
  if (process.argv.length !== 3) {
    throw new Error('Запуск: node measure.mjs <URL>');
  }
  const url = new URL(process.argv[2]);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Укажите адрес HTTP или HTTPS.');
  }

  const requests = 10;
  let totalBytes = 0;
  const durations = [];
  for (let i = 1; i <= requests; i++) {
    const start = performance.now();
    const response = await fetch(url, {
      headers: { 'Accept-Encoding': 'identity' },
      signal: AbortSignal.timeout(60_000),
    });
    const headersAt = performance.now();
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Запрос ${i}: HTTP ${response.status}`);
    }
    let firstBodyAt;
    if (response.body) {
      for await (const chunk of response.body) {
        if (chunk.byteLength > 0) firstBodyAt ??= performance.now();
        totalBytes += chunk.byteLength;
      }
    }
    const end = performance.now();
    const elapsed = end - start;
    durations.push(elapsed);
    const firstByte = firstBodyAt === undefined ? 'нет тела' : `${(firstBodyAt - start).toFixed(1)} мс`;
    console.log(`Запрос ${i}: всего ${elapsed.toFixed(1)} мс | до заголовков ${(headersAt - start).toFixed(1)} мс | до первого блока тела ${firstByte} | чтение тела ${(end - headersAt).toFixed(1)} мс`);
  }

  const totalMs = durations.reduce((sum, duration) => sum + duration, 0);
  const sorted = durations.toSorted((a, b) => a - b);
  const middle = sorted.length / 2;
  const median = (sorted[middle - 1] + sorted[middle]) / 2;
  console.log(`Медиана: ${median.toFixed(1)} мс`);
  console.log(`Среднее время: ${(totalMs / requests).toFixed(1)} мс`);
  console.log(`Получено: ${totalBytes} байт`);
  console.log(`Скорость: ${(totalBytes * 8 / (totalMs * 1000)).toFixed(3)} Мбит/с`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
