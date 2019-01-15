'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error('Можно прибавлять к вектору только вектор типа Vector');
    }
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  times(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!(pos instanceof Vector)) {
      throw new Error('Должно быть определено свойство pos, в котором размещен Vector');
    }
    if (!(size instanceof Vector)) {
      throw new Error('Должно быть определено свойство size, в котором размещен Vector');
    }
    if (!(speed instanceof Vector)) {
      throw new Error('Должно быть определено свойство speed, в котором размещен Vector');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }

  act() {}
  get left() {
    return this.pos.x;
  }
  get top() {
    return this.pos.y;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get type() {
    return 'actor';
  }

  isIntersect(item) {
    if (this === item) {
      return false
    };
    if (!(item instanceof Actor)) {
      throw new Error('Передан не объект типа Vector');
    } else if (item === undefined) {
      throw new Error('Объект не может быть пустым')
    }
    return !((item.left >= this.right) || (item.right <= this.left) || (item.top >= this.bottom) || (item.bottom <= this.top));
  }
}


class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.height = grid.length;
    this.player = actors.find(actor => actor.type === 'player');
    this.width = Math.max(0, ...(this.grid.map(item => item.length)));
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    return (this.status !== null && this.finishDelay < 0);
  }

  actorAt(player) {
    if (!(player instanceof Actor)) {
      throw new Error('Передан не объект типа Vector');
    } else if (player === undefined) {
      throw new Error('Объект не может быть пустым')
    }
    if (this.actors === undefined || this.actors.length === 1) {
      return undefined;
    }
    else return this.actors.find(actor => actor.isIntersect(player));
  }

  obstacleAt(pos, size) {
    const left = Math.floor(pos.x);
    const right = Math.ceil(pos.x + size.x);
    const top = Math.floor(pos.y);
    const bottom = Math.ceil(pos.y + size.y);
    if (!(pos instanceof Vector) || !(size instanceof Vector)) {
      throw new Error('Объект должен быть типа Vector');
    }

    if (left < 0 || right > this.width || top < 0) {
      return 'wall';
    }
    if (bottom > this.height) {
      return 'lava';
    }
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const gridBlock = this.grid[y][x];
        if (gridBlock) {
          return gridBlock;
        }
      }
    }
  }

  removeActor(actor) {
    const index = this.actors.indexOf(actor);
    if (index != -1) {
      this.actors.splice(index, 1);
    }
  }

  noMoreActors(type) {
    return !this.actors.some((actor) => actor.type === type)
  }

  playerTouched(touch, actor) {
    if (['lava', 'fireball'].some((block) => block === touch)) {
      return this.status = 'lost';
    }
    if (touch === 'coin' && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        return this.status = 'won'
      }
    }
  }
}

class LevelParser {
  constructor(dictionary) {
    this.dictionary = Object.assign({}, dictionary);
  }

  actorFromSymbol(symbol) {
    if (symbol != undefined && Object.keys(this.dictionary).indexOf(symbol) != -1) {
      return this.dictionary[symbol];
    }
  }

  obstacleFromSymbol(symbol) {
    if (symbol === 'x') {
      return 'wall';
    }

    if (symbol === '!') {
      return 'lava';
    }
  }

  createGrid(plan) {
    return plan.map(line => line.split('')).map(line => line.map(line => this.obstacleFromSymbol(line)));
  }


  createActors(plan) {
    var actors = [];
    plan.forEach((line, y) => {
      line.split('').forEach((symbol, x) => {
        var constructor = this.dictionary[symbol];
        if (!(typeof constructor === 'function' && new constructor instanceof Actor)) return;
        actors.push(new constructor(new Vector(x, y)));
      });
    });
    return actors;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed);
  }
  get type() {
    return 'fireball';
  }
  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  act(time, level) {
    const next = this.getNextPosition(time);
    if (level.obstacleAt(next, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = next
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 3));
    this.startingPos = pos;
  }
  handleObstacle() {
    this.pos = this.startingPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.spring = Math.random() * 2 * Math.PI;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.startingPos = this.pos;
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.startingPos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
  }
  get type() {
    return 'player';
  }
}


const actorDict = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': FireRain
};

const parser = new LevelParser(actorDict);

loadLevels()
  .then(schemas => {
    return runGame(JSON.parse(schemas), parser, DOMDisplay);
  })
  .then(() => alert('Вы выиграли приз!'));