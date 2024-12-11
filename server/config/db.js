const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB подключена успешно');
    } catch (err) {
        console.error('Ошибка подключения к MongoDB:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB; 