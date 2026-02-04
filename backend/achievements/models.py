from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Achievement(models.Model):
    RARITY_CHOICES = [
        ('common', 'Common'),
        ('rare', 'Rare'),
        ('epic', 'Epic'),
        ('legendary', 'Legendary'),
    ]
    
    code = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField()
    icon = models.CharField(max_length=50)
    rarity = models.CharField(max_length=20, choices=RARITY_CHOICES)
    xp_reward = models.IntegerField(default=0)
    unlock_condition = models.JSONField(default=dict, blank=True)
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['rarity', 'name']
        verbose_name = 'Achievement'
        verbose_name_plural = 'Achievements'
    
    def __str__(self):
        return f"{self.name} ({self.rarity})"


class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='unlocked_achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(auto_now_add=True)
    progress = models.JSONField(default=dict, blank=True)
    
    class Meta:
        unique_together = ['user', 'achievement']
        ordering = ['-unlocked_at']
        verbose_name = 'User Achievement'
        verbose_name_plural = 'User Achievements'
    
    def __str__(self):
        return f"{self.user.username} - {self.achievement.name}"


class UserProgress(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='progress')
    total_xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    
    workflows_created = models.IntegerField(default=0)
    workflows_published = models.IntegerField(default=0)
    workflows_shared = models.IntegerField(default=0)
    
    nodes_created = models.IntegerField(default=0)
    unique_node_types_used = models.IntegerField(default=0)
    
    executions_count = models.IntegerField(default=0)
    successful_executions = models.IntegerField(default=0)
    failed_executions = models.IntegerField(default=0)
    
    workflows_forked = models.IntegerField(default=0)
    comments_posted = models.IntegerField(default=0)
    likes_received = models.IntegerField(default=0)
    
    days_active = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'User Progress'
        verbose_name_plural = 'User Progress'
    
    def __str__(self):
        return f"{self.user.username} - Level {self.level} ({self.total_xp} XP)"
    
    def calculate_level(self):
        return max(1, self.total_xp // 1000 + 1)
    
    def add_xp(self, xp_amount):
        self.total_xp += xp_amount
        old_level = self.level
        self.level = self.calculate_level()
        self.save()
        return self.level > old_level
    
    def update_streak(self):
        today = timezone.now().date()
        
        if self.last_active_date:
            days_diff = (today - self.last_active_date).days
            
            if days_diff == 0:
                return False
            elif days_diff == 1:
                self.streak_days += 1
                self.days_active += 1
            else:
                self.streak_days = 1
                self.days_active += 1
        else:
            self.streak_days = 1
            self.days_active = 1
        
        self.last_active_date = today
        self.save()
        return True
