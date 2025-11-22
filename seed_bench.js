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

// --- МОДЕЛЬ MONGO ---
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

// --- ГЕНЕРАЦІЯ ---
const BOOKS_COUNT = 5000;      // Кількість книг
const REVIEWS_PER_BOOK = 5;    // Відгуків на книгу

async function seedData() {
    console.log('--- Початок генерації даних ---');
    
    await mongoose.connect(MONGO_URI);
    const pgPool = new Pool(PG_CONFIG);
    const pgClient = await pgPool.connect();

    try {
        // Очищення
        await MongoBook.deleteMany({});
        await pgClient.query('TRUNCATE TABLE Reviews RESTART IDENTITY CASCADE');
        console.log('Бази очищено.');

        console.log(`Генеруємо ${BOOKS_COUNT} книг у Mongo...`);
        
        const mongoBooks = [];
        for (let i = 1; i <= BOOKS_COUNT; i++) {
            const reviews = [];
            for (let j = 0; j < REVIEWS_PER_BOOK; j++) {
                reviews.push({
                    user_name: `User ${j}`,
                    rating: Math.floor(Math.random() * 5) + 1,
                    comment: `Review text for book ${i}`,
                    date: new Date()
                });
            }

            mongoBooks.push({
                original_id: i,
                title: `Book Title ${i}`,
                authors: [`Author ${i}`],
                genres: [`Genre ${i%5}`],
                reviews: reviews
            });
        }
        // Вставляємо пачкою (швидше)
        await MongoBook.insertMany(mongoBooks);
        console.log('Дані в MongoDB завантажено.');

        console.log('Генеруємо дані в SQL...');
        // В SQL ми просто заспамимо таблицю Reviews.
        // ВАЖЛИВО: Припускаємо, що user_id=1 та book_id=1 існують. 
        // Якщо у вас є хоча б 1 юзер і 1 книга, це спрацює.
        // Якщо книг мало, ми просто будемо посилатись на існуючі ID по колу.
        
        // Перевіримо, скільки реально книг є в SQL
        const bookCountRes = await pgClient.query('SELECT count(*) FROM Books');
        const realBookCount = parseInt(bookCountRes.rows[0].count);
        
        if (realBookCount === 0) {
            throw new Error("У таблиці Books немає записів! Додайте хоча б одну книгу через pgAdmin.");
        }

        const bigSql = `
            INSERT INTO Reviews (user_id, book_id, rating, comment) 
            SELECT 
                1, -- user_id (має існувати!)
                (random() * (${realBookCount} - 1) + 1)::int, -- random book_id
                (random() * 4 + 1)::int, 
                'Generated SQL review'
            FROM generate_series(1, ${BOOKS_COUNT * REVIEWS_PER_BOOK});
        `;
        await pgClient.query(bigSql);
        
        console.log('Дані в PostgreSQL завантажено.');

    } catch (e) {
        console.error('ПОМИЛКА:', e.message);
    } finally {
        await mongoose.disconnect();
        await pgClient.release();
        await pgPool.end();
        console.log('Готово.');
    }
}

seedData();