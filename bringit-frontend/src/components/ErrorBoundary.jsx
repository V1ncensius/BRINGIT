import { Component } from 'react';
import { CircleAlert } from 'lucide-react';

/** Menangkap error render agar satu halaman yang gagal tidak membuat layar kosong. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card card-pad flex flex-col items-center py-14 text-center">
        <CircleAlert className="text-danger" size={28} />
        <p className="mt-3 font-semibold text-white">Halaman gagal ditampilkan</p>
        <p className="mt-1 text-sm text-muted">{this.state.error.message}</p>
        <button className="btn-secondary btn-sm mt-5" onClick={() => this.setState({ error: null })}>
          Coba lagi
        </button>
      </div>
    );
  }
}
