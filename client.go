package wsroom

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

/* To figure out if they wanna broadcast to all or broadcast to all except them */
type Message struct {
	Type     string
	ClientID int
	Body     []byte
}

// FromJSON created a new Message struct from given JSON
func FromJSON(jsonInput []byte) (message *Message) {
	err := json.Unmarshal(jsonInput, &message)
	if err != nil {
		log.Println("write:", err)
	}
	return
}

/* Reads and writes messages from client */
type Client struct {
	conn *websocket.Conn
	out  chan []byte
	mu   sync.Mutex
}

/* Reads and pumps to out channel */
func (c *Client) ReadLoop() {
	defer close(c.out)
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			// log.Println("read:", err)
			break
		}
		//log.Println(string(message))
		if _, _, err := c.conn.NextReader(); err != nil {
			break
		}
		select {
		case c.out <- message:
		default:
		}
	}
}

/* Writes a message to the client */
func (c *Client) WriteMessage(msg []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()
	err := c.conn.WriteMessage(websocket.TextMessage, msg)
	if err != nil {
		log.Println("write:", err)
	}
}

/* Constructor */
func NewClient(conn *websocket.Conn) *Client {
	client := new(Client)
	client.conn = conn
	client.out = make(chan []byte)
	return client
}
