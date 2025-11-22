// benchmark.js
const { Pool } = require('pg');
const mongoose = require('mongoose');

// --- НАЛАШТУВАННЯ ---
const PG_CONFIG = {
    user: 'Andrii',
    host: 'localhost',
    database: 'postgres',
    password: '',
    port: 5432,
};
const MONGO_URI = 'mongodb://localhost:27017/library_lab2';

// --- МОДЕЛЬ (Та сама, що і в seed) ---
const bookSchema = new mongoose.Schema({
    original_id: Number, 
    title: String,
    authors: [String],   
    genres: [String],
    reviews: [{          
        user_name: String,
        rating: Number,
        comment: String,
        date: Date
    }]
});
const MongoBook = mongoose.model('Book', bookSchema);

async function runBenchmark() {
    console.log('Connecting to databases...');
    await mongoose.connect(MONGO_URI);
    const pgPool = new Pool(PG_CONFIG);
    const pgClient = await pgPool.connect();

    const ITERATIONS = 500; // Кількість повторів тесту
    console.log(`\n--- ПОЧАТОК ТЕСТУВАННЯ (${ITERATIONS} запитів) ---`);

    // ==========================================
    // ТЕСТ 1: SQL (JOINs)
    // ==========================================
    console.log('1. SQL: Отримання книги з авторами та відгуками (через JOIN)...');
    
    const sqlStart = performance.now();
    
    for (let i = 0; i < ITERATIONS; i++) {
        // Беремо випадковий ID книги (припускаємо, що є ID від 1 до 100)
        const bookId = Math.floor(Math.random() * 100) + 1;
        
        // Важкий запит: Книга + Автори (JOIN) + Відгуки (JOIN)
        const query = `
            SELECT b.title, r.comment, r.rating
            FROM Books b
            LEFT JOIN Reviews r ON b.book_id = r.book_id
            WHERE b.book_id = $1
            LIMIT 10; -- Обмежуємо, щоб не тягнути тисячі рядків, якщо їх багато
        `;
        await pgClient.query(query, [bookId]);
    }
    
    const sqlEnd = performance.now();
    const sqlTime = (sqlEnd - sqlStart).toFixed(2);
    console.log(`>> SQL Час: ${sqlTime} ms`);


    // ==========================================
    // ТЕСТ 2: NoSQL (Find One Document)
    // ==========================================
    console.log('\n2. NoSQL: Отримання документу книги (все в одному)...');

    const mongoStart = performance.now();

    for (let i = 0; i < ITERATIONS; i++) {
        // Шукаємо за полем original_id, яке ми створили
        const bookId = Math.floor(Math.random() * 100) + 1;
        await MongoBook.findOne({ original_id: bookId });
    }

    const mongoEnd = performance.now();
    const mongoTime = (mongoEnd - mongoStart).toFixed(2);
    console.log(`>> NoSQL Час: ${mongoTime} ms`);

    // ==========================================
    // ПІДСУМОК
    // ==========================================
    console.log('\n--- РЕЗУЛЬТАТИ ---');
    console.log(`SQL Average: ${(sqlTime / ITERATIONS).toFixed(3)} ms/req`);
    console.log(`NoSQL Average: ${(mongoTime / ITERATIONS).toFixed(3)} ms/req`);
    
    if (parseFloat(mongoTime) < parseFloat(sqlTime)) {
        const x = (sqlTime / mongoTime).toFixed(1);
        console.log(`✅ MongoDB швидша у ${x} разів для цього сценарію.`);
    } else {
        console.log(`❌ SQL виявився швидшим (можливо, мало даних або індекси Postgres дуже ефективні).`);
    }

    await mongoose.disconnect();
    await pgClient.release();
    await pgPool.end();
}

runBenchmark();