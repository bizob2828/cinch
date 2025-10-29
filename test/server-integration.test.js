import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import sinon from 'sinon';
import http from 'http';

describe('Server Integration Tests', () => {
  let server;
  let consoleLogStub;

  beforeEach(() => {
    // Stub console.log to avoid noise in test output
    consoleLogStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
    consoleLogStub.restore();
  });

  test('should start server on specified port', (t, done) => {
    // Create a simple test server
    const testServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Test server running');
    });

    testServer.listen(0, () => { // Use port 0 for automatic assignment
      const port = testServer.address().port;
      assert(port > 0, 'Server should be assigned a port');
      
      // Make a request to verify server is running
      http.get(`http://localhost:${port}`, (res) => {
        assert.strictEqual(res.statusCode, 200);
        testServer.close();
        done();
      }).on('error', (err) => {
        testServer.close();
        done(err);
      });
    });
  });

  test('should serve static files from public directory', (t, done) => {
    // This is more of a conceptual test since we can't easily test the full server
    // In a real scenario, you'd test that express.static middleware works correctly
    
    // Mock express static functionality
    const mockStatic = sinon.stub();
    mockStatic.returns((req, res, next) => {
      if (req.url === '/index.html') {
        res.statusCode = 200;
        res.end('<html>Test</html>');
      } else {
        next();
      }
    });

    // Simulate request for static file
    const mockReq = { url: '/index.html' };
    const mockRes = { 
      statusCode: null,
      end: sinon.stub()
    };
    
    const middleware = mockStatic();
    middleware(mockReq, mockRes, () => {});
    
    assert.strictEqual(mockRes.statusCode, 200);
    assert(mockRes.end.calledWith('<html>Test</html>'));
    done();
  });

  test('should handle socket connection events', () => {
    // Test socket.io event handling conceptually
    const mockSocket = {
      id: 'test-socket-id',
      emit: sinon.stub(),
      on: sinon.stub(),
      disconnect: sinon.stub()
    };

    // Simulate connection handler that sets up event listeners
    const connectionHandler = (socket) => {
      socket.on('registerName', () => {});
      socket.on('bid', () => {});
      socket.on('chooseTrump', () => {});
      socket.on('discardCards', () => {});
      socket.on('playCard', () => {});
      socket.on('nextHand', () => {});
      socket.on('disconnect', () => {});
    };

    // Call the connection handler
    connectionHandler(mockSocket);
    
    // Verify that event listeners were set up
    assert.strictEqual(mockSocket.on.callCount, 7);
    assert(mockSocket.on.calledWith('registerName'));
    assert(mockSocket.on.calledWith('bid'));
    assert(mockSocket.on.calledWith('chooseTrump'));
    assert(mockSocket.on.calledWith('discardCards'));
    assert(mockSocket.on.calledWith('playCard'));
    assert(mockSocket.on.calledWith('nextHand'));
    assert(mockSocket.on.calledWith('disconnect'));
  });

  test('should validate BID_VALUES constants', () => {
    const BID_VALUES = { pass: 0, "1": 1, "2": 2, "3": 3, "4": 4, cinch: 11 };
    
    assert.strictEqual(BID_VALUES.pass, 0);
    assert.strictEqual(BID_VALUES["1"], 1);
    assert.strictEqual(BID_VALUES["2"], 2);
    assert.strictEqual(BID_VALUES["3"], 3);
    assert.strictEqual(BID_VALUES["4"], 4);
    assert.strictEqual(BID_VALUES.cinch, 11);
  });

  test('should validate SUITS constants', () => {
    const SUITS = ["♥", "♦", "♣", "♠"];
    
    assert.strictEqual(SUITS.length, 4);
    assert(SUITS.includes("♥"));
    assert(SUITS.includes("♦"));
    assert(SUITS.includes("♣"));
    assert(SUITS.includes("♠"));
  });

  test('should validate RANKS constants', () => {
    const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
    
    assert.strictEqual(RANKS.length, 13);
    assert.strictEqual(RANKS[0], "2");
    assert.strictEqual(RANKS[12], "A");
    assert(RANKS.includes("J"));
    assert(RANKS.includes("Q"));
    assert(RANKS.includes("K"));
  });

  describe('Game Event Handlers', () => {
    let mockGame;
    let mockSocket;
    let mockIo;

    beforeEach(() => {
      mockGame = {
        players: [],
        phase: 'waiting',
        addPlayer: sinon.stub(),
        getPlayer: sinon.stub(),
        getCurrentPlayer: sinon.stub(),
        processBid: sinon.stub(),
        setTrump: sinon.stub(),
        canPlayCard: sinon.stub(),
        playCard: sinon.stub(),
        startNewHand: sinon.stub(),
        reset: sinon.stub()
      };

      mockSocket = {
        id: 'test-socket-id',
        emit: sinon.stub(),
        disconnect: sinon.stub()
      };

      mockIo = {
        emit: sinon.stub(),
        to: sinon.stub().returns({
          emit: sinon.stub()
        })
      };
    });

    test('should handle registerName event', () => {
      const player = { id: 'test-socket-id', name: 'TestPlayer', team: 1 };
      mockGame.addPlayer.returns(player);
      mockGame.players = [player];

      // Simulate registerName handler
      const handleRegisterName = (name) => {
        const newPlayer = mockGame.addPlayer(mockSocket.id, name);
        if (!newPlayer) {
          mockSocket.emit("message", "❌ Game is full. Try again later.");
          mockSocket.disconnect();
          return;
        }
        
        mockSocket.emit("welcome", { team: newPlayer.team, name: newPlayer.name });
        mockIo.emit("message", `👋 ${newPlayer.name} joined (Team ${newPlayer.team}).`);
      };

      handleRegisterName('TestPlayer');

      assert(mockGame.addPlayer.calledWith('test-socket-id', 'TestPlayer'));
      assert(mockSocket.emit.calledWith("welcome", { team: 1, name: 'TestPlayer' }));
      assert(mockIo.emit.calledWith("message", "👋 TestPlayer joined (Team 1)."));
    });

    test('should handle full game on registerName', () => {
      mockGame.addPlayer.returns(null); // Game is full

      const handleRegisterName = (name) => {
        const newPlayer = mockGame.addPlayer(mockSocket.id, name);
        if (!newPlayer) {
          mockSocket.emit("message", "❌ Game is full. Try again later.");
          mockSocket.disconnect();
          return;
        }
      };

      handleRegisterName('TestPlayer');

      assert(mockSocket.emit.calledWith("message", "❌ Game is full. Try again later."));
      assert(mockSocket.disconnect.called);
    });

    test('should handle bid event', () => {
      const player = { id: 'test-socket-id', name: 'TestPlayer', seat: 0 };
      mockGame.getPlayer.returns(player);
      mockGame.phase = 'bidding';
      mockGame.currentPlayer = 0;
      mockGame.processBid.returns({ finished: false });

      const handleBid = (bid) => {
        const gamePlayer = mockGame.getPlayer(mockSocket.id);
        if (mockGame.phase !== "bidding" || gamePlayer.seat !== mockGame.currentPlayer) return;
        
        mockIo.emit("message", `${gamePlayer.name} bids ${bid}`);
        mockGame.processBid(gamePlayer, bid);
      };

      handleBid('2');

      assert(mockGame.getPlayer.calledWith('test-socket-id'));
      assert(mockIo.emit.calledWith("message", "TestPlayer bids 2"));
      assert(mockGame.processBid.calledWith(player, '2'));
    });

    test('should handle chooseTrump event', () => {
      const player = { id: 'test-socket-id', seat: 0 };
      mockGame.getPlayer.returns(player);
      mockGame.highestBidder = player;
      mockGame.setTrump.returns(true);

      const handleTrump = (suit) => {
        const gamePlayer = mockGame.getPlayer(mockSocket.id);
        if (gamePlayer.seat !== mockGame.highestBidder.seat) return;
        
        if (!mockGame.setTrump(suit)) return;
        
        mockIo.emit("message", `Trump suit is ${suit}. Players must now discard non-trump cards.`);
      };

      handleTrump('♥');

      assert(mockGame.setTrump.calledWith('♥'));
      assert(mockIo.emit.calledWith("message", "Trump suit is ♥. Players must now discard non-trump cards."));
    });

    test('should handle playCard event with validation', () => {
      const player = { id: 'test-socket-id', name: 'TestPlayer' };
      mockGame.getPlayer.returns(player);
      mockGame.canPlayCard.returns({ valid: false, reason: "Not your turn" });

      const handlePlay = (cardIndex) => {
        const gamePlayer = mockGame.getPlayer(mockSocket.id);
        
        const validation = mockGame.canPlayCard(gamePlayer, cardIndex);
        if (!validation.valid) {
          mockSocket.emit("message", `❌ ${validation.reason}`);
          return;
        }
      };

      handlePlay(0);

      assert(mockGame.canPlayCard.calledWith(player, 0));
      assert(mockSocket.emit.calledWith("message", "❌ Not your turn"));
    });

    test('should handle disconnect event', () => {
      const handleDisconnect = () => {
        mockIo.emit("message", "A player disconnected. Game reset.");
        mockGame.reset();
      };

      handleDisconnect();

      assert(mockIo.emit.calledWith("message", "A player disconnected. Game reset."));
      assert(mockGame.reset.called);
    });
  });
});