package wsroom

type WsHandler func(r *Room, m Message)

func HandleFunc(pattern string, handler WsHandler) {
	if _, ok := Routes[pattern]; ok {
		panic("error: Duplicate HandleFunc")
	}
	Routes[pattern] = handler
}

func ExecFunction(pattern string, r *Room, m Message) {
	callFunction, ok := Routes[pattern]
	if ok {
		 callFunction(r, m)
	}
}

var Routes map[string]WsHandler

func init() {
	Routes = make(map[string]WsHandler)
}
