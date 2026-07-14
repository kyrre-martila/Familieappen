import { Component, type ErrorInfo, type ReactNode } from "react";
import { Screen, ErrorState } from "../components";

type State = { error: Error | null };
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Unhandled mobile error", error, info.componentStack); }
  render() { if (this.state.error) return <Screen><ErrorState description="Appen støtte på en uventet feil. Start appen på nytt hvis feilen vedvarer." /></Screen>; return this.props.children; }
}
