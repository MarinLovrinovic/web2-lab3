const canvasHeight = 720;
const canvasWidth = 1280;
const brickRowCount = 5;
const brickColumnCount = 10;
const brickSpacingHorizontal = 30;
const brickWidth = (canvasWidth - brickColumnCount * brickSpacingHorizontal) / brickColumnCount;
const brickSpacingVertical = 16;
const brickHeight = (360 - brickRowCount * brickSpacingVertical) / brickRowCount;
const paddleSpeed = 6;
const ballSpeed = 5;
const bevelWidth = 4;

var gameCanvas;
var ctx;
var intervalId;
var paddle;
var ball;
var objects = [];
var onTitleScreen = true;
var gameEnded = false;
var arrowLeftPressed = false;
var arrowRightPressed = false;
var currentPoints = 0;
var maxPoints;

// funkcija za inicijaliziranje igre, poziva se iz onload
function initializeGame() {
    gameCanvas = document.getElementById("gameCanvas");
    ctx = gameCanvas.getContext("2d");
    drawTitleScreen(); // poziva se funkcija koja prikazuje naslovni ekran
}

// dodaju se event listeneri za kontrolu igre (space i strelice lijevo i desno)
window.addEventListener("keydown", e => { 
    if (e.code == "Space") {
        spacePressed();
    }
    else if (e.code == "ArrowLeft") {
        arrowLeftPressed = true;
    }
    else if (e.code == "ArrowRight") {
        arrowRightPressed = true;
    }
});
window.addEventListener("keyup", e => {
    if (e.code == "ArrowLeft") {
        arrowLeftPressed = false;
    }
    else if (e.code == "ArrowRight") {
        arrowRightPressed = false;
    }
});

// funkcija za iscrtavanje naslovnog ekrana
function drawTitleScreen() {
    clearScreen();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px Helvetica";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BREAKOUT", canvasWidth / 2, canvasHeight / 2);

    ctx.font = "italic bold 18px Helvetica";
    ctx.textBaseline = "top";
    ctx.fillText("Press SPACE to begin", canvasWidth / 2, canvasHeight / 2 + 36 / 2 + 10);
}

// pomoćna funkcija
function clearScreen() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

// poziva se kada je space pritisnut, započinje igru ako smo na naslovnom ekranu
function spacePressed() {
    if (onTitleScreen) {
        onTitleScreen = false;
        startGame();
    }
}

// funkcija koja inicijalizira svo stanje igre i stavlja objekte igre ga u listu objects
function startGame() {
    // pokušavamo dobiti maxPoints iz localStorage
    maxPoints = localStorage.getItem('maxPoints');
    if(maxPoints === null) {
        maxPoints = '0';
        localStorage.setItem('maxScore', '0');
    }
    maxPoints = Number(maxPoints);

    // svaki zid je jedan objekt, zbog ovoga ne moramo implementirati dodatnu funkcionalnost provjere rubova terena
    // loptica se sudara sa svim objektima (osim sa samom sobom)
    let leftWall = {
        position: { // svaki objekt ima poziciju
            x: -5,
            y: canvasHeight / 2
        },
        size: { // svaki objekt ima veličinu
            x: 10,
            y: canvasHeight
        }
    }
    objects.push(leftWall);

    let rightWall = {
        position: {
            x: canvasWidth + 5,
            y: canvasHeight / 2
        },
        size: {
            x: 10,
            y: canvasHeight
        }
    }
    objects.push(rightWall);

    let topWall = {
        position: {
            x: canvasWidth / 2,
            y: -5
        },
        size: {
            x: canvasWidth,
            y: 10
        }
    }
    objects.push(topWall);

    let bottomWall = {
        position: {
            x: canvasWidth / 2,
            y: canvasHeight + 5
        },
        size: {
            x: canvasWidth,
            y: 10
        },
        onhit: gameOver // kada lopta pogodi objekt, ako objekt ima atribut onhit, bit će pozvana ta funkcija
        // pogađanje donjeg "zida" izaziva kraj igre
    }
    objects.push(bottomWall);

    // objekt palice
    paddle = {
        position: {
            x: canvasWidth / 2,
            y: canvasHeight - 50
        },
        size: {
            x: 50,
            y: 10
        },
        color: "#FFFFFF" // objekti koji imaju atribut color biti će iscrtavani u funkciji drawObjects 
    }
    objects.push(paddle);


    ball = {
        position: {
            x: paddle.position.x,
            y: paddle.position.y - 50
        },
        size: {
            x: 10,
            y: 10
        },
        color: "#FFFFFF",
        velocity: { // loptica ima dodatni atribut velocity (vektor brzine)
            // inicijalno je nasumično gore-lijevo ili gore-desno
            // računamo iz brzine uz pomoć konstante Math.SQRT1_2 koja je jednaka 1 / Math.sqrt(2)
            x: (ballSpeed * Math.SQRT1_2) * (Math.random() < 0.5 ? -1 : 1),
            y: -(ballSpeed * Math.SQRT1_2)
        }
    };
    objects.push(ball);

    // generiramo cigle
    let rowColors = ["rgb(153, 51, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 204)", "rgb(0, 255, 0)", "rgb(255, 255, 153)"]
    let cursorX = brickSpacingHorizontal / 2 + brickWidth / 2;
    let cursorY = 50 + brickSpacingVertical;
    for (row = 0; row < brickRowCount; row++) {
        let color = rowColors[row % rowColors.length]
        for (column = 0; column < brickColumnCount; column++) {
            let brick = {
                position: {
                    x: cursorX,
                    y: cursorY
                },
                size: {
                    x: brickWidth,
                    y: brickHeight
                },
                color: color,
                onhit: function () { // kada je cigla pogođena, označava se za uništavanje i povećava broj bodova
                    this.destroyed = true;
                    currentPoints++;
                    if (currentPoints >= brickRowCount * brickColumnCount) { // ako su sve cigle uništene, igra je gotova
                        gameWon();
                    }
                },
                destroyed: false // objekti koji imaju atribut destroyed = true uklanjaju se iz liste objekata 
            };
            objects.push(brick);
            cursorX += brickWidth + brickSpacingHorizontal;
        }
        cursorX = brickSpacingHorizontal / 2 + brickWidth / 2;
        cursorY += brickHeight + brickSpacingVertical;
    }

    intervalId = setInterval(update, 20); // započinjemo update loop
}

function update() { // prvo mičemo palicu, pa simuliramo loptu, pa iscrtavamo novo stanje igre na ekran
    movePaddle();
    moveBall();
    objects = objects.filter(o => !o.destroyed); // objekti koji imaju atribut destroyed = true uklanjaju se iz liste objekata
    if (!gameEnded) {
        drawGame();    
    }
}

function movePaddle() {
    let moveInput = 0;
    if (arrowLeftPressed) {
        moveInput -= 1;
    }
    if (arrowRightPressed) {
        moveInput += 1;
    }
    paddle.position.x += moveInput * paddleSpeed; // ovisno o pritiskanju strelica mičemo palicu lijevo ili desno
    paddle.position.x = clamp(paddle.position.x, paddle.size.x / 2, canvasWidth - paddle.size.x / 2);
    paddle.paddle
}

// pomoćna funkcija za ograničavanje vrijednosti, da palica ne pobjegne iz ekrana
function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function moveBall() {
    ball.position.x += ball.velocity.x;
    ball.position.y += ball.velocity.y;

    for (let o of objects) {
        if (o === ball) continue; // ne sudara se sama sa sobom
        // ovdje računamo koliko se loptica preklapa sa objektom u obje dimenzije
        let xOverlap = (ball.size.x + o.size.x) / 2 - Math.abs(ball.position.x - o.position.x);
        let yOverlap = (ball.size.y + o.size.y) / 2 - Math.abs(ball.position.y - o.position.y);

        if (xOverlap > 0 && yOverlap > 0) { // ako se preklapa u obje dimenzije, dogodio se sudar
            // vjerojatno smo se sudarili u stranu gdje je preklapanje manje, pa tu komponentu brzine obrćemo,
            // osim ako su preklapanja vrlo slična, što znači da smo "pogodili kut",
            // pa obrćemo cijeli velocity vektor i množimo ga se 1.05
            if (Math.abs(xOverlap - yOverlap) < 2) {
                ball.velocity.x *= -1.05;
                ball.velocity.y *= -1.05;
            }
            else if (xOverlap < yOverlap) {
                ball.velocity.x *= -1;
            }
            else {
                ball.velocity.y *= -1;
            }
            if (o.onhit !== undefined) {
                o.onhit();
            }
        }
    }
}

function drawGame() {
    clearScreen(); // čistimo ekran
    drawScore(); // ispisujemo rezultat
    drawObjects(); // isctavamo sve objekte
}

function drawScore() { // ispisivanje rezultata prema detaljim uputama
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "18px Helvetica";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(currentPoints, 20, 20);

    ctx.textAlign = "right";
    ctx.fillText(maxPoints, canvasWidth - 100, 20);
}

function drawObjects() {
    for (let o of objects) {
        if (o.color === undefined) continue; // iscrtavamo sve objekte koji imaju atribut color
        drawBrick(o.position.x - o.size.x / 2, o.position.y - o.size.y / 2, o.size.x, o.size.y, o.color);
    }
}

// pomoćna funkcija koja iscrtava pravokutnik sa 3D efektom
function drawBrick(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height); 

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(x, y, width, bevelWidth);
    ctx.fillRect(x, y, bevelWidth, height);

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(x, y + height - bevelWidth, width, bevelWidth);
    ctx.fillRect(x + width - bevelWidth, y, bevelWidth, height);
}

function gameOver() {
    endGame(); // poziv funkcije za završetak igre
    clearScreen();
    // ispisivanje poruke "GAME OVER"
    ctx.fillStyle = "rgb(255, 255, 0)";
    ctx.font = "bold 40px Helvetica";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", canvasWidth / 2, canvasHeight / 2);
}

function gameWon() {
    endGame();// poziv funkcije za završetak igre
    clearScreen();
    // ispisivanje poruke "YOU WON!"
    ctx.fillStyle = "rgb(255, 255, 0)";
    ctx.font = "bold 40px Helvetica";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOU WIN!", canvasWidth / 2, canvasHeight / 2);
}

// pomoćna funkcija koja se poziva kada pobijedimo ili izgubimo
function endGame() {
    gameEnded = true;
    clearInterval(intervalId); // zaustavlja se update loop
    if (currentPoints > maxPoints) { // sprema se novi maxPoints
        localStorage.setItem('maxPoints', currentPoints); 
    }
}