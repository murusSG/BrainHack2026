import { Component } from 'react';

export class MapErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Map unavailable:', error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="map-unavailable" role="status">
          <p>Map unavailable</p>
          <span>Incident details remain available in the list.</span>
        </div>
      );
    }

    return this.props.children;
  }
}
