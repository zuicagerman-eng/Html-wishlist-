# 🎄 Wish List Navideña · Andrea & David

Nuestra lista de deseos de Navidad, hecha para usarse desde el iPhone.
La página vive en **GitHub Pages** y todo se guarda en una **hoja de Google Sheets** de Drive, así que no se pierde nada.

![Vista previa en iPhone](docs/vista-previa.jpg)

## ✨ Qué hace

Una Navidad mágica de castillo: cielo estrellado con nieve, velas flotantes y deseos escritos en pergamino. Todos los dibujos son originales.

- ✉️ **Cartas con lacre:** cada quien abre su carta (Andrea o David) una sola vez en su teléfono.
- ✍️ **Deseos completos:** qué es, tipo de regalo, cuánto lo quieres (❤️ a ❤️❤️❤️), precio aproximado (con una gema que cambia de color según el precio), link de la tienda y notas (talla, color…).
- 🎁 **Apartar regalos:** en la lista del otro tocas *"Yo se lo regalo"*, se abre un cofre del tesoro y el deseo queda sellado con lacre. Después marcas *"Ya lo compré"*.
- 🤫 **Hechizo sorpresa:** en tu propia lista **nunca** ves qué te apartaron o compraron.
- 🦉 **Lechuza mensajera:** cruza la pantalla con tu carta cada vez que agregas un deseo.
- 🧚 **Hada guía:** tócala y te da consejos.
- 🟡 **Esfera dorada con alas:** de vez en cuando cruza volando… ¡atrápala! La página lleva la cuenta.
- 🕯️ **Corona de Adviento:** se enciende una vela cada domingo de Adviento, junto a la cuenta regresiva a Navidad.
- 🪄 En la compu, el cursor es una varita que deja chispas.
- 👀 **Familia y amigos** pueden entrar como invitados para ver las listas y apartar regalos (no se duplican: si dos aprietan al mismo tiempo, gana el primero).
- ☁️ **No se pierde nada:** todo queda en Google Sheets. Sin internet, el teléfono guarda los cambios y los sube solo cuando vuelve la conexión.
- 📱 **Como app:** se puede agregar a la pantalla de inicio del iPhone y abre aunque no haya internet.
- 🔋 Abajo hay un botón **"✨ Magia: sí/no"** para pausar las animaciones y ahorrar batería.

---

## 🛠️ Cómo dejarla funcionando (una sola vez, ~10 minutos)

> Los pasos 1 y 2 conviene hacerlos **desde una computadora**: el editor de Apps Script no funciona bien en el iPhone.

### Paso 1 · La hoja de Google y su "servidor"

1. Crea una hoja nueva en Google Sheets (por ejemplo entrando a [sheets.new](https://sheets.new)) y ponle de nombre **Wish List Navideña**.
2. En la hoja, ve al menú **Extensiones → Apps Script**.
3. Arriba a la izquierda cambia *"Proyecto sin título"* por **Wish List**. Borra el código de ejemplo y pega **todo** el contenido de [`google-apps-script/Code.gs`](google-apps-script/Code.gs). Guarda con 💾.
4. Arriba a la derecha: botón azul **Implementar → Nueva implementación**.
5. Junto a "Seleccionar tipo", toca el engranaje ⚙️ y elige **Aplicación web**. Llena así:
   - **Descripción:** Wish List
   - **Ejecutar como:** Yo (tu correo)
   - **Quién tiene acceso:** **Cualquier usuario** ← ¡importante! (no "Cualquier usuario con cuenta de Google")
6. **Implementar → Autorizar acceso** → elige tu cuenta.
   Google va a decir *"Google no ha verificado esta app"*: entra a **Configuración avanzada → Ir a Wish List (no seguro) → Permitir**. Es normal: el script lo creaste tú y solo trabaja con tu hoja.
7. Copia la **URL de la aplicación web**: empieza con `https://script.google.com/macros/s/` y termina en **`/exec`**.

✅ **Prueba rápida:** abre esa URL en el navegador. Debe aparecer algo como `{"items":[],"ok":true}`.
La pestaña **Deseos** se crea sola en la hoja la primera vez.

### Paso 2 · Conectar la página con la hoja

1. Aquí en GitHub abre el archivo [`config.js`](config.js) y toca el lápiz ✏️ (*Edit this file*).
2. Pega la URL entre las comillas de `SCRIPT_URL`:
   ```js
   SCRIPT_URL: "https://script.google.com/macros/s/AKfy...../exec",
   ```
3. Botón verde **Commit changes**.

Ahí mismo puedes cambiar los nombres (`PERSONAS`) y el símbolo de moneda (`MONEDA`).

### Paso 3 · Publicarla con GitHub Pages

1. En este repositorio: **Settings → Pages**.
2. En *Build and deployment* → **Source: Deploy from a branch**.
3. En **Branch** elige la rama que tiene estos archivos y la carpeta **/ (root)** → **Save**.
4. En 1 o 2 minutos queda lista en:
   **https://zuicagerman-eng.github.io/Html-wishlist-/**

### Paso 4 · En el iPhone (Andrea y David)

1. Abran el link en **Safari**.
2. Toquen **Compartir** (el cuadrito con la flechita ⬆️) → **Agregar a pantalla de inicio** → **Agregar**.
3. Ábranla desde el ícono del arbolito 🎄 y cada quien elige su nombre.

Arriba siempre se ve el estado: **"✅ Todo guardado en Google Sheets"** significa que ya está a salvo.

---

## ❓ Preguntas frecuentes

**¿Se puede perder lo que escribimos?**
No. Todo queda en la hoja de Google, que además guarda historial (*Archivo → Historial de versiones*). Si se va el internet, el teléfono guarda los cambios (se ven con "⏳ Guardando…") y los sube solos cuando vuelve la conexión. Y si borras algo sin querer, tienes unos segundos para tocar **Deshacer**.

**¿Andrea puede ver lo que le voy a regalar?**
En la página, no: en tu propia lista nunca aparece si alguien apartó o compró algo. **Pero en la hoja de Google sí se ve** (columnas *Reservado por* y *Estado*)… así que mejor no la abran 😉

**¿Puedo editar directamente en la hoja?**
Sí. Puedes cambiar textos o agregar filas a mano: basta con llenar *Persona* (igualito a como está en `config.js`) y *Deseo*; el ID se pone solo. La página lo verá al actualizarse (cada 30 segundos o tocando "Actualizar").

**¿Cómo cambio un nombre?**
En `config.js`. Si ya hay deseos con el nombre viejo, cámbialo también en la columna *Persona* de la hoja.

**Cambié `Code.gs` y no pasa nada.**
Hay que publicar una versión nueva: **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. Así la URL sigue siendo la misma.

**Sale "⚠️ No pude conectar con Google Sheets".**
Revisa que la implementación tenga **Quién tiene acceso: Cualquier usuario** y que en `config.js` esté la URL que termina en `/exec`.

**¿Es privada?**
No tiene contraseña: cualquiera con el link (o que lea `config.js`, porque este repositorio es público) podría ver y editar la lista. Para una lista de regalos está bien, pero no escriban datos sensibles.

---

## 🗂️ Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página completa (diseño navideño + lógica). |
| `config.js` | **Tu configuración:** URL de la hoja, nombres y moneda. |
| `google-apps-script/Code.gs` | El código que va dentro de la hoja de Google (Extensiones → Apps Script). |
| `sw.js`, `manifest.webmanifest`, `icons/` | Para que funcione como app en el iPhone y abra sin internet. |
