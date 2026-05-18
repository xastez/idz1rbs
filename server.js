import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const pool = mysql.createPool({
    host: '127.0.1.26', 
    user: 'root',
    password: '',
    database: 'lb_pdo_workers',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


app.use(express.static(__dirname));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.get('/api/init-data', async (req, res) => {
    try {
        const [projects] = await pool.query("SELECT ID_PROJECTS, name FROM project");
        const [chiefs] = await pool.query("SELECT DISTINCT chief FROM department");
        res.json({ projects, chiefs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/get_workers_text.php', async (req, res) => {
    const chief = req.query.chief_name || '';
    try {
        const [rows] = await pool.query(
            "SELECT COUNT(*) as count FROM worker JOIN department ON worker.FID_DEPARTMENT = department.ID_DEPARTMENT WHERE department.chief = ?",
            [chief]
        );
        res.type('text/plain; charset=utf-8'); 
        res.send(`Кількість підлеглих: ${rows[0].count || 0}`);
    } catch (err) {
        res.status(500).send("Помилка БД");
    }
});


app.get('/get_project_time_xml.php', async (req, res) => {
    const pid = req.query.project_id || 0;
    try {
        const [rows] = await pool.query(
            "SELECT SUM(TIMESTAMPDIFF(HOUR, time_start, time_end)) as hours FROM work WHERE FID_PROJECTS = ?",
            [pid]
        );
        const hours = rows[0].hours || 0;
        
    
        const xml = `<?xml version="1.0" encoding="UTF-8"?><result><hours>${hours}</hours></result>`;
        
        res.type('application/xml'); 
        res.send(xml);
    } catch (err) {
        res.status(500).send("Помилка БД");
    }
});


app.get('/get_dates.php', async (req, res) => {
    const pid = req.query.project_id || 0;
    try {
        const [rows] = await pool.query(
            "SELECT DISTINCT DATE_FORMAT(time_start, '%Y-%m-%d') as work_date FROM work WHERE FID_PROJECTS = ? ORDER BY work_date DESC",
            [pid]
        );
        const dates = rows.map(row => row.work_date);
        res.json(dates);
    } catch (err) {
        res.status(500).json([]);
    }
});


app.get('/get_tasks_json.php', async (req, res) => {
    const pid = req.query.project_id || 0;
    const date = req.query.task_date || '';
    try {
      
        const [rows] = await pool.query(
            "SELECT description, DATE_FORMAT(time_start, '%Y-%m-%d %H:%i:%s') as time_start, DATE_FORMAT(time_end, '%Y-%m-%d %H:%i:%s') as time_end FROM work WHERE FID_PROJECTS = ? AND DATE(time_start) = ?",
            [pid, date]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json([]);
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущено: http://localhost:${PORT}`);
});