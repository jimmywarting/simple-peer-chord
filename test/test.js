var test = require('tape'),
	co = require('co'),
	Chord = require('../lib/chord'),
	NodeId = require('../lib/node-id')()

var count = 8,
	chords = [ ],
	interval = 3000,
	opts = {
		stabilizeInterval: 200,
	}

test('create a node', t => {
	t.plan(4)

	chords[0] = new Chord(opts, true)

	setTimeout(_ => {
		var idToQuery = NodeId.create()
		Promise.all(chords.map(c => co(c.node.findPredecessorId(idToQuery))))
			.then(ret => t.deepEqual(ret, chords.map(c => ret[0])))
		Promise.all(chords.map(c => co(c.node.findSuccessorId(idToQuery))))
			.then(ret => t.deepEqual(ret, chords.map(c => ret[0])))
		Promise.all(chords.map(c => co(c.node.findPredecessorId(c.id))))
			.then(ret => t.deepEqual(ret, chords.map(c => c.node.predecessorId)))
		Promise.all(chords.map(c => co(c.node.findSuccessorId(c.id))))
			.then(ret => t.deepEqual(ret, chords.map(c => c.id)))
	}, interval)
})

test('join to network', t => {
	t.plan(4)

	var remaining = count

	function addChord() {
		var chord = new Chord(opts, chords[0])
		chords.push(chord)

		console.log('node added, ' + (-- remaining) + ' remainning')
		chord.once('chord-start',
			_ => setTimeout(remaining > 0 ? addChord : checkResult, 500))
	}

	function checkResult() {
		var idToQuery = NodeId.create()
		Promise.all(chords.map(c => co(c.node.findPredecessorId(idToQuery))))
			.then(ret => t.deepEqual(ret, chords.map(c => ret[0])))
		Promise.all(chords.map(c => co(c.node.findSuccessorId(idToQuery))))
			.then(ret => t.deepEqual(ret, chords.map(c => ret[0])))
		Promise.all(chords.map(c => co(c.node.findPredecessorId(c.id))))
			.then(ret => t.deepEqual(ret, chords.map(c => c.node.predecessorId)))
		Promise.all(chords.map(c => co(c.node.findSuccessorId(c.id))))
			.then(ret => t.deepEqual(ret, chords.map(c => c.id)))
	}

	addChord()
})

test('routing', t => {
	t.plan(chords.length * (chords.length - 1))

	chords.forEach(c => c.on('ping1', data => {
		t.equal(data, c.id)
	}))

	chords.forEach(c => chords.forEach(s => {
		if (c !== s) s.send(c.id, 'ping1', c.id)
	}))
})

test('multi-routing', t => {
	t.plan(chords.length)

	var rand = Math.random()

	chords.forEach(c => c.on('ping2', data => {
		t.equal(data, rand)
	}))

	chords[0].send(chords.map(c => c.id), 'ping2', rand)
})

test('storage put #1', t => {
	t.plan(1)

	chords[0].put('hello', 'world')

	setTimeout(_ => {
		Promise.all(chords.map(c => c.get('hello')))
			.then(ret => t.deepEqual(ret, chords.map(c => 'world')))
	}, interval)
})

test('storage put #2', t => {
	t.plan(1)

	chords[0].put('hello', 'world!')

	setTimeout(_ => {
		Promise.all(chords.map(c => c.get('hello')))
			.then(ret => t.deepEqual(ret, chords.map(c => 'world!')))
	}, interval)
})

test('node failure #1', t => {
	t.plan(3)

	var keys = chords.map(c => Object.keys(c.node.storage)).filter(keys => keys[0]),
		chord = chords.filter(c => c.node.isResponsibleFor(keys[0]))[0]
	chord.stop()
	chords = chords.filter(c => c !== chord)

	setTimeout(_ => {
		var idToQuery = NodeId.create()
		Promise.all(chords.map(c => co(c.node.findPredecessorId(idToQuery))))
			.then(ret => t.deepEqual(ret, chords.map(c => ret[0])))
		Promise.all(chords.map(c => co(c.node.findSuccessorId(idToQuery))))
			.then(ret => t.deepEqual(ret, chords.map(c => ret[0])))
		Promise.all(chords.map(c => c.get('hello')))
			.then(ret => t.deepEqual(ret, chords.map(c => 'world!')))
	}, interval)
})

test('node rejoin', t => {
	t.plan(3)

	var chord = new Chord(opts, chords[0])
	chords.push(chord)

	chord.once('chord-start', _ => setTimeout(_ => {
		var idToQuery = NodeId.create()
		Promise.all(chords.map(c => co(c.node.findPredecessorId(idToQuery))))
			.then(ret => t.deepEqual(ret, chords.map(c => ret[0])))
		Promise.all(chords.map(c => co(c.node.findSuccessorId(idToQuery))))
			.then(ret => t.deepEqual(ret, chords.map(c => ret[0])))
		Promise.all(chords.map(c => c.get('hello')))
			.then(ret => t.deepEqual(ret, chords.map(c => 'world!')))
	}, interval))
})

test('node failure #2', t => {
	t.plan(3)

	var keys = chords.map(c => Object.keys(c.node.storage)).filter(keys => keys[0]),
		chord = chords.filter(c => c.node.isResponsibleFor(keys[0]))[0]
	chord.stop()
	chords = chords.filter(c => c !== chord)

	setTimeout(_ => {
		var idToQuery = NodeId.create()
		Promise.all(chords.map(c => co(c.node.findPredecessorId(idToQuery))))
			.then(ret => t.deepEqual(ret, chords.map(c => ret[0])))
		Promise.all(chords.map(c => co(c.node.findSuccessorId(idToQuery))))
			.then(ret => t.deepEqual(ret, chords.map(c => ret[0])))
		Promise.all(chords.map(c => c.get('hello')))
			.then(ret => t.deepEqual(ret, chords.map(c => 'world!')))
	}, interval)

})

test('stop', t => {
	t.plan(1)

	t.ok(1)
	
	t.once('end', _ => chords.forEach(c => c.stop()))
})
