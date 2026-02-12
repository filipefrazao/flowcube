from django.db import models


class PageAnalytics(models.Model):
    page = models.ForeignKey(
        'pagecube.Page',
        on_delete=models.CASCADE,
        related_name='analytics',
    )
    date = models.DateField()
    views = models.IntegerField(default=0)
    unique_visitors = models.IntegerField(default=0)
    form_submissions = models.IntegerField(default=0)
    conversion_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    avg_time_on_page = models.IntegerField(default=0)  # seconds
    bounce_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )

    class Meta:
        db_table = 'pagecube_analytics'
        unique_together = ['page', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.page.title} - {self.date}"
