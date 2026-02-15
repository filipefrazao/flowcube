from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import (
    AttendanceFilter,
    ClassFilter,
    ContentBlockFilter,
    CustomerFilter,
    EducationFlowFilter,
    EnrollmentFilter,
    LocationFilter,
    PoleFilter,
    StudentFilter,
)
from .models import (
    Attendance, Class, ContentBlock, Customer, EducationFlow,
    Enrollment, Location, Pole, Student,
)
from .serializers import (
    AttendanceSerializer,
    ClassSerializer,
    ContentBlockSerializer,
    CustomerSerializer,
    EducationFlowSerializer,
    EnrollmentSerializer,
    LocationSerializer,
    PoleSerializer,
    StudentSerializer,
)


class PoleViewSet(viewsets.ModelViewSet):
    queryset = Pole.objects.all()
    serializer_class = PoleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PoleFilter
    search_fields = ["name", "city", "state"]
    ordering_fields = ["name", "city", "created_at"]

    def get_queryset(self):
        return Pole.objects.annotate(
            classes_count=Count("classes", distinct=True),
            customers_count=Count("customers", distinct=True),
            locations_count=Count("locations", distinct=True),
        )

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        pole = self.get_object()
        classes = Class.objects.filter(pole=pole)
        return Response({
            "id": str(pole.id),
            "name": pole.name,
            "total_classes": classes.count(),
            "classes_proxima": classes.filter(status="proxima").count(),
            "classes_em_andamento": classes.filter(status="em_andamento").count(),
            "classes_finalizada": classes.filter(status="finalizada").count(),
            "total_enrollments": Enrollment.objects.filter(course_class__pole=pole).count(),
            "total_customers": Customer.objects.filter(pole=pole).count(),
            "total_locations": Location.objects.filter(pole=pole).count(),
        })


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = LocationFilter
    search_fields = ["name", "city", "address"]
    ordering_fields = ["name", "city", "created_at"]


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CustomerFilter
    search_fields = ["name", "email", "phone", "cpf", "cnpj", "company"]
    ordering_fields = ["name", "created_at", "city"]

    def get_queryset(self):
        return Customer.objects.select_related("pole", "owner", "lead").annotate(
            enrollments_count=Count("enrollments", distinct=True),
        )

    @action(detail=True, methods=["get"])
    def journey(self, request, pk=None):
        """Get full customer journey: enrollments, classes, attendance."""
        customer = self.get_object()
        enrollments = Enrollment.objects.filter(customer=customer).select_related(
            "student", "course_class"
        )
        students = Student.objects.filter(customer=customer)
        return Response({
            "customer": CustomerSerializer(customer).data,
            "enrollments": EnrollmentSerializer(enrollments, many=True).data,
            "students_count": students.count(),
            "classes_count": enrollments.values("course_class").distinct().count(),
        })

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Overview of all customers."""
        qs = Customer.objects.all()
        return Response({
            "total": qs.count(),
            "ativos": qs.filter(status="ativo").count(),
            "inativos": qs.filter(status="inativo").count(),
            "prospects": qs.filter(status="prospect").count(),
            "pessoa_fisica": qs.filter(tipo_pessoa="fisica").count(),
            "pessoa_juridica": qs.filter(tipo_pessoa="juridica").count(),
        })

    @action(detail=True, methods=["get"])
    def enrollments(self, request, pk=None):
        """Get all enrollments for this customer."""
        customer = self.get_object()
        enrollments = Enrollment.objects.filter(customer=customer).select_related(
            "student", "course_class"
        )
        return Response(EnrollmentSerializer(enrollments, many=True).data)

    @action(detail=True, methods=["get"], url_path="notes_list")
    def notes_list(self, request, pk=None):
        """Get customer notes."""
        customer = self.get_object()
        return Response({"notes": customer.notes or ""})

    @action(detail=True, methods=["post"], url_path="add_note")
    def add_note(self, request, pk=None):
        """Add a note to customer (appended to notes field)."""
        customer = self.get_object()
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "text is required"}, status=status.HTTP_400_BAD_REQUEST)
        from django.utils import timezone
        timestamp = timezone.now().strftime("%d/%m/%Y %H:%M")
        new_note = f"[{timestamp}] {text}"
        if customer.notes:
            customer.notes = f"{customer.notes}\n{new_note}"
        else:
            customer.notes = new_note
        customer.save(update_fields=["notes"])
        return Response({"notes": customer.notes})


class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ClassFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "start_date", "created_at"]

    def get_queryset(self):
        return Class.objects.select_related(
            "location", "instructor", "pole", "product"
        ).annotate(
            students_count=Count("students", distinct=True),
            enrollments_count=Count("enrollments", distinct=True),
        )

    @action(detail=True, methods=["get"])
    def enrollments(self, request, pk=None):
        """List all enrollments for this class."""
        course_class = self.get_object()
        enrollments = Enrollment.objects.filter(
            course_class=course_class
        ).select_related("student", "customer")
        serializer = EnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def attendance_report(self, request, pk=None):
        """Attendance summary for this class."""
        course_class = self.get_object()
        enrollments = Enrollment.objects.filter(course_class=course_class)
        total_enrollments = enrollments.count()
        attendance_data = []
        for enrollment in enrollments.select_related("student"):
            total = Attendance.objects.filter(enrollment=enrollment).count()
            present = Attendance.objects.filter(enrollment=enrollment, present=True).count()
            attendance_data.append({
                "student_id": str(enrollment.student.id),
                "student_name": enrollment.student.name,
                "enrollment_status": enrollment.status,
                "total_sessions": total,
                "present": present,
                "absent": total - present,
                "rate": round(present / total * 100, 1) if total > 0 else 0,
            })
        return Response({
            "class_id": str(course_class.id),
            "class_name": course_class.name,
            "total_enrollments": total_enrollments,
            "attendance": attendance_data,
        })


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = EnrollmentFilter
    search_fields = ["student__name", "course_class__name"]
    ordering_fields = ["enrolled_at", "status"]

    def get_queryset(self):
        return Enrollment.objects.select_related("student", "course_class", "customer")

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Enrollment status overview."""
        qs = Enrollment.objects.all()
        return Response({
            "total": qs.count(),
            "pendente": qs.filter(status="pendente").count(),
            "confirmado": qs.filter(status="confirmado").count(),
            "ausente": qs.filter(status="ausente").count(),
            "sem_contato": qs.filter(status="sem_contato").count(),
            "transferido": qs.filter(status="transferido").count(),
        })


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = StudentFilter
    search_fields = ["name", "email", "phone", "cpf"]
    ordering_fields = ["name", "enrollment_date", "created_at"]

    def get_queryset(self):
        return Student.objects.select_related("student_class", "location", "customer")


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = AttendanceFilter
    ordering_fields = ["date", "created_at"]

    def get_queryset(self):
        return Attendance.objects.select_related(
            "enrollment__student", "enrollment__course_class", "recorded_by"
        )

    @action(detail=False, methods=["post"])
    def bulk_record(self, request):
        """Bulk record attendance for a class session (legacy format).
        Expects: { "course_class_id", "date", "records": [{"enrollment_id", "present", "notes"}] }
        """
        class_id = request.data.get("course_class_id")
        date = request.data.get("date")
        records = request.data.get("records", [])

        if not class_id or not date or not records:
            return Response(
                {"error": "course_class_id, date, and records are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        for record in records:
            enrollment_id = record.get("enrollment_id")
            present = record.get("present", False)
            notes = record.get("notes", "")
            att, was_created = Attendance.objects.update_or_create(
                enrollment_id=enrollment_id,
                date=date,
                defaults={
                    "present": present,
                    "notes": notes,
                    "recorded_by": request.user,
                },
            )
            created.append(AttendanceSerializer(att).data)

        return Response({"count": len(created), "records": created}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="bulk_create")
    def bulk_create(self, request):
        """Bulk create/update attendance records (frontend format).
        Expects: { "records": [{"enrollment": "<uuid>", "date": "2026-02-15", "present": true, "notes": ""}] }
        """
        records = request.data.get("records", [])
        if not records:
            return Response({"error": "records is required."}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        for record in records:
            enrollment_id = record.get("enrollment")
            date = record.get("date")
            present = record.get("present", False)
            notes = record.get("notes", "")
            if not enrollment_id or not date:
                continue
            att, _ = Attendance.objects.update_or_create(
                enrollment_id=enrollment_id,
                date=date,
                defaults={
                    "present": present,
                    "notes": notes,
                    "recorded_by": request.user,
                },
            )
            created.append(AttendanceSerializer(att).data)

        return Response({"count": len(created), "records": created}, status=status.HTTP_201_CREATED)


class EducationFlowViewSet(viewsets.ModelViewSet):
    queryset = EducationFlow.objects.all()
    serializer_class = EducationFlowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = EducationFlowFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        return EducationFlow.objects.select_related("education_class").prefetch_related("blocks")


class ContentBlockViewSet(viewsets.ModelViewSet):
    queryset = ContentBlock.objects.all()
    serializer_class = ContentBlockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = ContentBlockFilter
    ordering_fields = ["order", "created_at"]

    def get_queryset(self):
        return ContentBlock.objects.select_related("flow")
