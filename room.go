package wsroom

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

/* Has a name, clients, count which holds the actual coutn and index which acts as the unique id */
type Room struct {
	name    string
	clients map[int]*Client
	count   int
	index   int
	mu      sync.Mutex
}

/* Add a conn to clients map so that it can be managed */
func (r *Room) Join(conn *websocket.Conn) int {
	r.index++
	r.mu.Lock()
	r.clients[r.index] = NewClient(conn)
	r.mu.Unlock()
	log.Printf("New Client joined %s", r.name)
	r.count++
	return r.index
}

/* Removes client from room */
func (r *Room) Leave(id int) {
	log.Println("Client leave", id)
	r.count--
	r.mu.Lock()
	delete(r.clients, id)
	r.mu.Unlock()
}

/* Send to specific client */
func (r *Room) SendTo(id int, msg []byte) {
	r.mu.Lock()
	r.clients[id].WriteMessage(msg)
	r.mu.Unlock()
}

/* Broadcast to every client */
func (r *Room) BroadcastAll(msg []byte) {
	for _, client := range r.clients {
		client.WriteMessage(msg)
	}
}

func (r *Room) Broadcast(tp string, msg []byte) {
	response := struct {
		Type string
		Body string
	}{
		Type: tp,
		Body: string(msg),
	}
	jsn, err := json.Marshal(response)
	if err != nil {
		panic(err)
	}

	r.BroadcastAll(jsn)
}

func (r *Room) BroadcastTo(senderID int, tp string, msg []byte) {
	response := struct {
		Type string
		Body string
	}{
		Type: tp,
		Body: string(msg),
	}
	jsn, err := json.Marshal(response)
	if err != nil {
		panic(err)
	}

	r.SendTo(senderID, jsn)
}

func (r *Room) BroadcastExceptTo(senderID int, tp string, msg []byte) {
	response := struct {
		Type string
		Body string
	}{
		Type: tp,
		Body: string(msg),
	}
	jsn, err := json.Marshal(response)
	if err != nil {
		panic(err)
	}
	r.BroadcastEx(senderID, jsn)
}

/* Broadcast to all except */
func (r *Room) BroadcastEx(senderid int, msg []byte) {
	for id, client := range r.clients {
		if id != senderid {
			client.WriteMessage(msg)
		}
	}
}

/* Handle messages */
func (r *Room) HandleMsg(id int) {
	for {

		r.mu.Lock()

		if r.clients[id] == nil {
			break
		}

		r.mu.Unlock()

		r.mu.Lock()

		out := <-r.clients[id].out

		r.mu.Unlock()

		event := FromJSON(out)
		if event != nil {
			if event.Type == "ex" {
				r.BroadcastEx(id, event.Body)
			} else {
				event.ClientID = id
				ExecFunction(event.Type, r, *event)
			}
		}
	}
}

/* Constructor */
func NewRoom(name string) *Room {
	room := new(Room)
	room.name = name
	room.clients = make(map[int]*Client)
	room.count = 0
	room.index = 0
	return room
}
