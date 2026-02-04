from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Achievement, UserAchievement, UserProgress
from .serializers import (
    AchievementSerializer,
    UserAchievementSerializer,
    UserProgressSerializer
)
from .services import AchievementService


class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def user_achievements(self, request):
        user_achievements = UserAchievement.objects.filter(
            user=request.user
        ).select_related('achievement')
        
        serializer = UserAchievementSerializer(user_achievements, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def check_unlocks(self, request):
        newly_unlocked = AchievementService.check_and_unlock(request.user)
        
        if newly_unlocked:
            serializer = AchievementSerializer(newly_unlocked, many=True)
            return Response({
                'message': f'Unlocked {len(newly_unlocked)} new achievements!',
                'achievements': serializer.data
            })
        
        return Response({'message': 'No new achievements unlocked'})


class UserProgressViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProgress.objects.all()
    serializer_class = UserProgressSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return UserProgress.objects.all()
        return UserProgress.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        progress, created = UserProgress.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(progress)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def increment_workflow(self, request):
        progress, _ = UserProgress.objects.get_or_create(user=request.user)
        progress.workflows_created += 1
        progress.update_streak()
        progress.save()
        
        newly_unlocked = AchievementService.check_and_unlock(request.user)
        
        return Response({
            'progress': UserProgressSerializer(progress).data,
            'newly_unlocked': AchievementSerializer(newly_unlocked, many=True).data
        })
    
    @action(detail=False, methods=['post'])
    def increment_execution(self, request):
        success = request.data.get('success', True)
        
        progress, _ = UserProgress.objects.get_or_create(user=request.user)
        progress.executions_count += 1
        
        if success:
            progress.successful_executions += 1
        else:
            progress.failed_executions += 1
        
        progress.update_streak()
        progress.save()
        
        newly_unlocked = AchievementService.check_and_unlock(request.user)
        
        return Response({
            'progress': UserProgressSerializer(progress).data,
            'newly_unlocked': AchievementSerializer(newly_unlocked, many=True).data
        })
