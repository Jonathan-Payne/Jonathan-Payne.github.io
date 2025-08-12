//PRNG (using sfc32 from PractRand)
function sfc32(a, b, c, d) {
  return function() {
    a |= 0; b |= 0; c |= 0; d |= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}


//show slider val in text
const slider = document.getElementById("slider")
const sliderval = document.getElementById("sliderval");
sliderval.innerHTML = slider.value;
slider.oninput = function() {
    sliderval.innerHTML = this.value;
}

//generate button
document.getElementById('generate').onclick = () => {
    generate();
}


function generate() {
    const boardContainer = document.getElementById('boardContainer');
    //erase any previous generations
    boardContainer.replaceChildren();



    //PRNG
    const seedgen = () => (Math.random()*2**32)>>>0;
    const getRand = sfc32(seedgen(), seedgen(), seedgen(), seedgen());



    //init board array
    let board = {
        grid: [],
        shapes: [],
        len: slider.value,
        seed: -1
    }
    for (let i = 0; i < board.len; i++) {
        board.grid[i] = [];
        for (let j = 0; j < board.len; j++) {
            board.grid[i][j] = {
                isStar: false,
                isInitialized: false,
                shapeNum: -1,
                row: i,
                col: j
            }
        }
    }

    //set appropriate number of columns
    boardContainer.style.gridTemplateColumns = `repeat(${board.len}, 20px)`;


    //add cells as HTML elements
    for (let i = 0; i < board.len; i++) {
        for (let j = 0; j < board.len; j++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.width = '10px';
            cell.style.height = '10px';
            cell.style.backgroundColor = `rgb(${i * (255 / board.len)}, ${j * (255 / board.len)}, 0)`;

            boardContainer.append(cell);
        }
    }

    
}