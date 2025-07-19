const express = require( 'express' );
const http = require( 'http' );
const path = require( 'path' );
const socketIO = require( 'socket.io' );

const app = express();
const server = http.createServer( app );
const io = socketIO( server );

app.use( express.static( path.join( __dirname, 'public' ) ) );

const users = {};

io.on( 'connection', ( socket ) => {
    let username = "";
    let currentRoom = "general";

    socket.on( 'set username', ( name ) => {
        username = name;
        users[ socket.id ] = name;
    } );

    socket.on( 'join room', ( room ) => {
        if ( currentRoom ) socket.leave( currentRoom );
        socket.join( room );
        currentRoom = room;
    } );

    socket.on( 'chat message', ( { msg, room } ) => {
        const time = new Date().toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
        io.to( room ).emit( 'chat message', { user: username, msg, time } );
    } );

    socket.on( 'typing', ( room ) => {
        socket.to( room ).emit( 'typing', username );
    } );

    socket.on( 'disconnect', () => {
        delete users[ socket.id ];
    } );
} );

const PORT = process.env.PORT || 3000;
server.listen( PORT, () => {
    console.log( `Server running on http://localhost:${ PORT }` );
} );