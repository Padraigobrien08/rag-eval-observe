interface Metric {
  name: string
  value: number
  timestamp: string
  tags?: Record<string, string>
}

class MetricsCollector {
  private metrics: Metric[] = []

  record(name: string, value: number, tags?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
    })
  }

  increment(name: string, tags?: Record<string, string>) {
    this.record(name, 1, tags)
  }

  getMetrics(): Metric[] {
    return [...this.metrics]
  }

  clear() {
    this.metrics = []
  }
}

export const metrics = new MetricsCollector()

