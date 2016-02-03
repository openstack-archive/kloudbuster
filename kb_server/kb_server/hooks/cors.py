from pecan.hooks import PecanHook


class CorsHook(PecanHook):

    def after(self, state):
        state.response.headers['Access-Control-Allow-Origin'] = '*'
        state.response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        state.response.headers['Access-Control-Allow-Headers'] = 'origin, authorization, accept'
        if not state.response.headers['Content-Length']:
            state.response.headers['Content-Length'] = str(len(state.response.body))
