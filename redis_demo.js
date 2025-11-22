// redis_demo.js
const { createClient } = require('redis');

async function runRedisDemo() {
    console.log('--- Redis Demo (Key-Value Store) ---');

    // 1. Створення клієнта
    const client = createClient();

    client.on('error', (err) => console.log('Redis Client Error', err));

    // 2. Підключення
    await client.connect();
    console.log('Підключено до Redis');

    // --- Сценарій 1: Простий запис (Кешування рядка) ---
    const key = 'session:user:101';
    const value = 'Andrii Logged In';
    
    console.log(`\n1. SET: Зберігаємо ключ [${key}] -> "${value}"`);
    await client.set(key, value, {
        EX: 10 // Expiration: видалити через 10 секунд (TTL)
    });

    // --- Сценарій 2: Читання ---
    const result = await client.get(key);
    console.log(`2. GET: Отримано значення -> "${result}"`);

    // --- Сценарій 3: Лічильник переглядів (Atomic Increment) ---
    // Це те, де Redis знищує SQL по швидкості
    const bookCounterKey = 'book:55:views';
    
    console.log(`\n3. INCR: Збільшуємо лічильник переглядів для книги #55...`);
    await client.set(bookCounterKey, '0'); // Початкове значення
    
    const v1 = await client.incr(bookCounterKey);
    console.log(`   Переглядів: ${v1}`);
    
    const v2 = await client.incr(bookCounterKey);
    console.log(`   Переглядів: ${v2}`);
    
    const v3 = await client.incr(bookCounterKey);
    console.log(`   Переглядів: ${v3}`);

    // 4. Відключення
    await client.disconnect();
    console.log('\nДемо завершено.');
}

runRedisDemo();