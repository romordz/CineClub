import { useState } from "react";

function Registro2() {
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');

    function inputInfo(event){
        setNombre(event.target.value);
        console.log(nombre);
    }

    return (

        <div>
            {/* Nombre */}
            <label htmlFor="nombre">Nombre</label>
            <input
                type="text"
                id="nombre"
                name="nombre"
                placeholder="Ingresa tu nombre completo"
                onChange={(e)=>setNombre(e,target.value)}
                required
            />

            {/* Email */}
            <label htmlFor="email">Email</label>
            <input
                type="email"
                id="email"
                name="email"
                placeholder="Ingresa tu correo"
                onChange={(e)=>setCorreo(e,target.value)}
                required
            />

            {/* Contraseña */}
            <label htmlFor="password">Contraseña</label>
            <input
                type="password"
                id="password"
                name="password"
                placeholder="Crea una contraseña segura"
                onChange={(e)=>setPassword(e,target.value)}
                required
            />

            {/* Botón de registro */}
            <button type="submit">Registrarse</button>

        </div>
    );
}

export default Registro2;