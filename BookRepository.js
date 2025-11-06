class BookRepository {
    constructor(client) {
      // Репозиторій працює з конкретним клієнтом (з'єднанням),
      // щоб бути частиною транзакції
      this.client = client;
    }
  
    // --- Метод, що викликає VIEW ---
    async getAvailableBooks() {
      // ВАЖЛИВО: Жодного 'SELECT * FROM Books'. Використовуємо View!
      const query = {
        text: 'SELECT * FROM v_AvailableBookDetails',
      };
  
      try {
        const result = await this.client.query(query);
        return result.rows; // Повертає масив книг
      } catch (err) {
        console.error('Помилка у getAvailableBooks:', err.message);
        throw err;
      }
    }
  
    // --- Метод, що викликає ЗБЕРЕЖЕНУ ПРОЦЕДУРУ ---
    async createLoan(userId, bookItemId, staffId, dueDate) {
      // ВАЖЛИВО: Викликаємо SP, а не пишемо INSERT/UPDATE
      const query = {
        text: 'CALL sp_CreateLoan($1, $2, $3, $4)',
        values: [userId, bookItemId, staffId, dueDate],
      };
  
      try {
        await this.client.query(query);
        console.log('Книгу успішно видано!');
      } catch (err) {
        // Наша SP (sp_CreateLoan) кидає помилки (RAISE EXCEPTION),
        // ми їх тут перехоплюємо (напр. "Користувач має не_оплачені штрафи.")
        console.error('Помилка під час видачі книги:', err.message);
        throw err; // Кидаємо помилку далі, щоб транзакція скасувалась
      }
    }
  
    // ...тут можна додати інші методи, напр. returnBook
  }
  
  module.exports = BookRepository;