class Rand {
    sfc32(a, b, c, d) {
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
    
    //seeded
    constructor(a, b, c, d) {
        this.nextRand = this.sfc32(a, b, c, d);
    }

    //random seed
    static unseededRand() {
        const seedgen = () => (Math.random()*2**32)>>>0;
        return new Rand(seedgen(), seedgen(), seedgen(), seedgen());
    }

    nextInt(bound) {
        return Math.floor(this.nextRand() * bound);
    }
}

class Board {
    grid;
    shapes;
    len;
    #rand;

    constructor(len, rand) {
        console.assert(len >= 8);
        this.len = len;
        this.grid = [];
        for (let i = 0; i < len; i++) {
            this.grid[i] = [];
            for (let j = 0; j < len; j++) {
                new Cell(i, j, this);
            }
        }
        this.shapes = [];
        this.#rand = rand;
    }

    generate() {
        this.#genStars();
        this.#genShapes();
    }


    //for board generation
    #resetShapes() {
        this.shapes = [];
        for (let i = 0; i < this.len; i++) {
            for (let j = 0; j < this.len; j++) {
                this.grid[i][j].shapeNum = -1;
            }
        }
    }

    cellsWithoutShape() {
        for (const row of this.grid) {
            for (const cell of row) {
                if (cell.shapeNum == -1) {
                    return true;
                }
            }
        }
        return false;
    }


    #genShapes() {
        /*
        until all stars are part of a shape
            pick a random star
            expand from it until the shape hits another star
            if it runs out of room to expand and hasn't hit a star, then return false
        expand each shape randomly until the whole board is full
        return true

        average of 5 attempts to generate shapes correctly
         */

        //make shapes encompassing all stars
        for (let i = 0; i < this.len; i++) { //board side length = number of shapes (pairs of stars)
            let looseStars = this.getLooseStars();
            let star = looseStars[this.#rand.nextInt(looseStars.length)];
            let s = new Shape(this);
            s.annex(star);
            while (s.numStars() < 2) {
                 if (s.getEmptyNeighbors().length > 0) {
                     s.expandBy1(this.#rand);
                 } else {
                     this.#resetShapes();
                     this.#genShapes();
                     return;
                 }
            }
        }

        //expand shapes until they fill the whole board
        while (this.cellsWithoutShape()) {
            let shape = this.shapes[this.#rand.nextInt(this.shapes.length)];
            if (shape.getEmptyNeighbors().length > 0) {
                shape.expandBy1(this.#rand);
            }
        }

        return true;
    }

    getLooseStars() {
        let looseStars = [];
        for (let i = 0; i < this.len; i++) {
            for (let j = 0; j < this.len; j++) {
                if (this.grid[i][j].isStar && this.grid[i][j].shapeNum == -1) {
                    looseStars.push(this.grid[i][j]);
                }
            }
        }
        return looseStars;
    }

    #genStars() {
        for (let row = 0; row < this.len; row++) {
            for (let star = 0; star < 2; star++) {
                let emptySpaces = [];
                for (let col = 0; col < this.len; col++) {
                    if (!this.grid[row][col].isInitialized) {
                        emptySpaces.push(this.grid[row][col]);
                    }
                }
                if (emptySpaces.length < (2 - star)) { //if overcrowded, retry
                    this.resetStars();
                    this.#genStars();
                    return;
                }

                //set one random empty cell in the row to a star and mark the appropriate x's
                //(do this 2x per row)
                emptySpaces[this.#rand.nextInt(emptySpaces.length)].setIsStarExplode(true);
            }
        }
        return true;
    }

    resetStars() {
        for (let i = 0; i < this.len; i++) {
            for (let j = 0; j < this.len; j++) {
                this.grid[i][j].resetCell();
            }
        }
    }

    starsInRow(row) {
        let stars = 0;
        for (let i = 0; i < this.len; i++) {
            if (this.grid[row][i].isStar) {
                stars++;
            }
        }
        return stars;
    }
    starsInCol(col) {
        let stars = 0;
        for (let i = 0; i < this.len; i++) {
            if (this.grid[i][col].isStar) {
                stars++;
            }
        }
        return stars;
    }

    checkIsCorrect() {
        // if (this.grid[0][0].isStar) {
        //     victoryAnim();
        //     return;
        // }

        for (let i = 0; i < this.len; i++) {
            if (this.starsInRow(i) != 2) return;
            if (this.starsInCol(i) != 2) return;
        }


        for (const shape of this.shapes) {
            if (shape.numStars() != 2) return;
        }

        for (let i = 0; i < this.len; i+=2) {
            for (let j = 0; j < this.len; j+=2) {
                let cell = this.grid[i][j];
                if (cell.isStar) {
                    let neighbors = cell.get8Neighbors();
                    for (const c of neighbors) {
                        if (c != null)
                            if (c.isStar) return;
                    }
                }
            }
        }

        
        victory();
    }


    display() {
        const boardContainer = document.getElementById('boardContainer');
        //erase any previous generations
        boardContainer.replaceChildren();


        //set appropriate number of columns, and column/row scaling
        const percent = 100 / this.len;
        boardContainer.style.gridTemplateColumns = `repeat(${this.len}, ${percent}%)`;
        boardContainer.style.gridAutoRows = `${percent}%`;
        
        //add cells as HTML elements
        for (let i = 0; i < this.len; i++) {
            for (let j = 0; j < this.len; j++) {
                let hCell = document.createElement('div');
                let bCell = this.grid[i][j];
                hCell.className = 'cell';
                
                hCell.append(bCell.renderImg());

                //border styling
                hCell.style.border = '1px solid gray';
                let neighbors = bCell.get4Neighbors();
                if (neighbors[0] != null)
                    if (neighbors[0].shapeNum != bCell.shapeNum)
                        hCell.style.borderTop = '2px solid black';
                if (neighbors[1] != null)
                    if (neighbors[1].shapeNum != bCell.shapeNum)
                        hCell.style.borderLeft = '2px solid black';
                if (neighbors[2] != null)
                    if (neighbors[2].shapeNum != bCell.shapeNum)
                        hCell.style.borderRight = '2px solid black';
                if (neighbors[3] != null)
                    if (neighbors[3].shapeNum != bCell.shapeNum)
                        hCell.style.borderBottom = '2px solid black';

                hCell.dataset.row = i;
                hCell.dataset.col = j;

                boardContainer.append(hCell);
            }
        }
    }
}

class Cell {
    isStar = false;
    isInitialized = false;
    shapeNum = -1;
    row;
    col;
    board;

    constructor(row, col, board) {
        this.row = row;
        this.col = col;
        this.board = board;
        board.grid[row][col] = this;
    }

    //for clicking only
    cycleState() {
        if (!this.isInitialized) this.isInitialized = true;
        else if (!this.isStar) this.isStar = true;
        else {
            this.isInitialized = false;
            this.isStar = false;
        }
    }

    //star or cross inside cell
    renderImg() {
        let stateDisplay = document.createElement('img');
        stateDisplay.className = 'stateDisplay';
        if (this.isStar) {    
            stateDisplay.src = "assets/star.svg"
            stateDisplay.style.scale = 0.75;
            stateDisplay.classList.add('star');
        } else if (this.isInitialized) {
            stateDisplay.src = "assets/cross.svg"
            stateDisplay.style.scale = 0.35;
            stateDisplay.classList.add('cross');
        }
        return stateDisplay;
    }
    
    resetCell() {
        this.isInitialized = false;
        this.isStar = false;
    }

    setIsStarExplode(star) {
        if (star) {
            this.isInitialized = true;
            this.isStar = true;
            this.eliminateNearby8();
            this.eliminateRow();
            this.eliminateCol();
        } else {
            this.isInitialized = true;
            this.isStar = false;
        }
    } //explode means it eliminates nearby and aligned cells

    setIsStar(star) {
        if (star) {
            this.isInitialized = true;
            this.isStar = true;
        } else {
            this.isInitialized = true;
            this.isStar = false;
        }
    }

    eliminateNearby8() {
        let neighbors = this.get8Neighbors();
        for (let i = 0; i < neighbors.length; i++) {
            if (neighbors[i] != null) {
                neighbors[i].setIsStar(false);
            }
        }
    }

    get8Neighbors() {
        let neighbors = [];
        let r, c;
        let h = this.board.grid.length;
        let w = this.board.grid[0].length;
        let index = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (!(i == 0 && j == 0)) {
                    r = this.row + i;
                    c = this.col + j;
                    if (r >= 0 && r < h && c >= 0 && c < w) {
                        //if in bounds
                        neighbors[index] = this.board.grid[r][c];
                    } else {
                        neighbors[index] = null;
                    }
                    index++;
                }
            }
        }
        return neighbors;
    }

    eliminateRow() {
        if (this.board.starsInRow(this.row) >= 2) {
            for (let i = 0; i < this.board.len; i++) {
                if (!this.board.grid[this.row][i].isInitialized) {
                    this.board.grid[this.row][i].setIsStar(false);
                }
            }
        }
    }
    eliminateCol() {
        if (this.board.starsInCol(this.col) >= 2) {
            for (let i = 0; i < this.board.len; i++) {
                if (!this.board.grid[i][this.col].isInitialized) {
                    this.board.grid[i][this.col].setIsStar(false);
                }
            }
        }
    }

    get4Neighbors() {
        let neighbors = [];

        if (this.row > 0) neighbors[0] = this.board.grid[this.row-1][this.col];
        else neighbors[0] = null;

        if (this.col > 0) neighbors[1] = this.board.grid[this.row][this.col-1];
        else neighbors[1] = null;

        if (this.col < this.board.grid[0].length - 1) neighbors[2] = this.board.grid[this.row][this.col+1];
        else neighbors[2] = null;

        if (this.row < this.board.grid.length - 1) neighbors[3] = this.board.grid[this.row+1][this.col];
        else neighbors[3] = null;

        return neighbors;
    }
}

class Shape {
    group;
    board;
    shapeNum;

    constructor(board) {
        this.board = board;
        this.group = [];
        this.shapeNum = board.shapes.length;
        board.shapes.push(this);
    }

    annex(cellToAdd) {
        this.group.push(cellToAdd);
        cellToAdd.shapeNum = this.shapeNum;
    }

    numStars() {
        let stars = 0;
        for (let i = 0; i < this.group.length; i++) {
            if (this.group[i].isStar) {
                stars++;
            }
        }
        return stars;
    }

    getEmptyNeighbors() {
        let emptyNeighbors = [];
        for (let i = 0; i < this.group.length; i++) {
            let neighbors = this.group[i].get4Neighbors();
            for (let j = 0; j < 4; j++) {
                if (neighbors[j] != null) {
                    if (neighbors[j].shapeNum == -1) {
                        emptyNeighbors.push(neighbors[j]);
                    }
                }
            }
        }
        return emptyNeighbors;
    }

    expandBy1(rand) {
        //annex random neighbor if possible, if not, throw error
        let emptyNeighbors = this.getEmptyNeighbors();
        console.assert(emptyNeighbors.length > 0);

        let expandTo = emptyNeighbors[rand.nextInt(emptyNeighbors.length)];
        this.annex(expandTo);
    }
}

//show slider val in text
const slider = document.getElementById("slider")
const sliderval = document.getElementById("sliderval");
sliderval.innerHTML = slider.value;
slider.oninput = function() {
    sliderval.innerHTML = this.value;
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function detectClick(event) {
    const cell = event.target.closest('.cell');
    if (!cell) return; // clicked outside a cell

    cell.replaceChildren();
    let bCell = b.grid[cell.dataset.row][cell.dataset.col]
    bCell.cycleState();
    cell.append(bCell.renderImg());
    if (bCell.isStar || !bCell.isInitialized) b.checkIsCorrect();
}

function newBoard() {
    let r = Rand.unseededRand();
    b = new Board(slider.value, r);
    b.generate();
    b.resetStars();        
    b.display();

    const greyedOut = document.getElementById('boardContainer');
    greyedOut.style.filter = 'brightness(100%)';
    greyedOut.style.backgroundColor = '#fff';
    greyedOut.style.transition = '0s';

    const victoryDisp = document.getElementById('victory');
    victoryDisp.style.opacity = '0';
    victoryDisp.style.zIndex = '-1';
    victoryDisp.style.transition = '0s';

    const boardContainer = document.getElementById('boardContainer');
    boardContainer.addEventListener('pointerdown', detectClick);
}


newBoard();

//generate button
document.getElementById('generate').onclick = () => {
    boardContainer.removeEventListener('pointerdown', detectClick);
    newBoard();
}

//todo new idea: instead of just text, have box with victory text and time to complete puzzle
function victory() {
    const greyedOut = document.getElementById('boardContainer');
    greyedOut.style.filter = 'brightness(50%)';
    greyedOut.style.backgroundColor = '#ccc';
    greyedOut.style.transition = '1s ease-in-out';

    const victoryDisp = document.getElementById('victory');
    victoryDisp.style.opacity = '1';
    victoryDisp.style.zIndex = '10';
    victoryDisp.style.transition = '1s ease-in-out';

    //why does this work?
    //shouldn't boardContainer be undefined?
    boardContainer.removeEventListener('pointerdown', detectClick);
}