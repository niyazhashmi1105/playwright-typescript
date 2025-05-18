import jenkins.model.Jenkins
import hudson.security.Permission
import org.jenkinsci.plugins.prometheus.config.PrometheusConfiguration

// Configure Prometheus plugin
try {
    def config = PrometheusConfiguration.get()
    config.setDefaultNamespace("jenkins")
    config.setPath("/prometheus")
    config.setUseAuthenticatedEndpoint(false)
    config.setCollectingMetricsPeriodInSeconds(120)
    config.setAppendParamLabel(false)
    
    println("Prometheus metrics endpoint configured at: /prometheus")
} catch (Exception e) {
    println("Error configuring Prometheus: " + e.getMessage())
    e.printStackTrace()
}
