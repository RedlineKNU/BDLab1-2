const pool = require('./db'); // Наш пул з'єднань
const UnitOfWork = require('./UnitOfWork');

// --- 1. Функція для отримання книг (використовує VIEW) ---
// (Тут не потрібна транзакція, бо це простий READ)
async function getBooksExample() {
  console.log('--- Отримання списку доступних книг (з View)... ---');
  
  // Для простих запитів можна брати клієнта і одразу повертати
  const client = await pool.connect(); 
  try {
    const bookRepo = new UnitOfWork(client).books; // Можна і так
    const books = await bookRepo.getAvailableBooks();
    
    console.log('Доступні книги:', books);
  } catch (err) {
    console.error('Помилка:', err.message);
  } finally {
    client.release(); // ЗАВЖДИ повертаємо клієнта до пулу
  }
}

// --- 2. Функція видачі книги (використовує SP + Transaction) ---
// Це головна логіка Unit of Work
async function issueBookTransaction(userId, bookItemId, staffId) {
  console.log('\n--- Спроба видати книгу (через SP + Transaction)... ---');
  
  // Крок 1: "Орендуємо" одне з'єднання (клієнта) з пулу
  const client = await pool.connect();
  
  try {
    // Крок 2: Починаємо транзакцію (це і є наша "одиниця роботи")
    await client.query('BEGIN');
    
    // Крок 3: Створюємо Unit of Work з цим клієнтом
    const unitOfWork = new UnitOfWork(client);

    // Крок 4: Виконуємо операцію через репозиторій
    // (наприклад, видаємо книгу 1 користувачу 1 від співробітника 1)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // +14 днів
    
    await unitOfWork.books.createLoan(userId, bookItemId, staffId, dueDate);

    // (Якщо б у вас була інша операція, напр. списання грошей,
    // ви б викликали її тут, і вона б пройшла в тій самій транзакції)
    // await unitOfWork.payments.createPayment(...) 

    // Крок 5: Якщо все пройшло без помилок - підтверджуємо транзакцію
    await client.query('COMMIT');
    console.log('ТРАНЗАКЦІЮ УСПІШНО ЗАВЕРШЕНО (COMMIT)');
    
  } catch (e) {
    // Крок 6: Якщо будь-який 'await' (в т.ч. всередині SP) кинув помилку
    // - відкочуємо УСІ зміни
    await client.query('ROLLBACK');
    console.error('ТРАНЗАКЦІЮ ВІДКОЧЕНО (ROLLBACK)');
    console.error('Причина:', e.message); // Напр. "Користувач має не_оплачені штрафи."
  } finally {
    // Крок 7: В будь-якому випадку повертаємо клієнта до пулу
    client.release();
    console.log('Клієнта повернуто до пулу.');
  }
}

// --- Запуск прикладів ---
// (Вам потрібно вставити ID, які реально існують у вашій БД)
// (Спочатку додайте дані в pgAdmin)

async function main() {
  // await getBooksExample();
  
  // Вставте сюди ID користувача, екземпляра книги та співробітника
  // await issueBookTransaction(1, 1, 1); 
  
  // (Спробуйте викликати з невірними даними, щоб побачити ROLLBACK)
  // await issueBookTransaction(99, 1, 1); // Помилка: "Користувач не знайдений"

  await pool.end(); // Закриваємо пул, коли програма завершується
}

// --- Запуск прикладів ---
async function main() {
    // Тест 1: Успішна видача
    // User ID: 1 (Іван, "добрий")
    // BookItem ID: 1 (Книга А, 'Available')
    // Staff ID: 1 (Марія)
    await issueBookTransaction(1, 1, 1);
  
    await pool.end();
  }
  
  main().catch(err => console.error('Глобальна помилка:', err));


// async function main() {
//   // Тест 2: Провал видачі (боржник)
//   // User ID: 2 (Петро, "поганий")
//   // BookItem ID: 2 (Книга B, 'Available')
//   // Staff ID: 1 (Марія)
//   await issueBookTransaction(2, 2, 1);

//   await pool.end();
// }

// main().catch(err => console.error('Глобальна помилка:', err));