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
  let totalMs = 0;
  for (let i = 1; i <= requests; i++) {
    const start = performance.now();
    const response = await fetch(url, {
      headers: { 'Accept-Encoding': 'identity' },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Запрос ${i}: HTTP ${response.status}`);
    }
    if (response.body) {
      for await (const chunk of response.body) {
        totalBytes += chunk.byteLength;
      }
    }
    totalMs += performance.now() - start;
  }

  console.log(`Среднее время: ${(totalMs / requests).toFixed(1)} мс`);
  console.log(`Получено: ${totalBytes} байт`);
  console.log(`Скорость: ${(totalBytes * 8 / (totalMs * 1000)).toFixed(3)} Мбит/с`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
