const express = require('express');
const app = express('cors');
const cors = require('mysql');

app.use(cors());
app.use(express.json());

app.listen(3001,
    () => {
        console.log("escuchando en el puerto 3001");
    }
)

const db = mysql.createConnection({
    host: 'localhost',    // Cambia según tu servidor
    user: 'root',         // Tu usuario de MySQL
    password: 'eafb180302',         // Tu contraseña de MySQL
    database: 'pw2_ejemplo'   // Nombre de la base de datos
})