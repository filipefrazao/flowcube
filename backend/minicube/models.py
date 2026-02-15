from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class Pole(models.Model):
    """Polo - Physical location/franchise unit for classes."""
    STATUS_CHOICES = [
        ("ativo", "Ativo"),
        ("inativo", "Inativo"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=300, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=2, blank=True, default="")
    zip_code = models.CharField(max_length=10, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    manager = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="minicube_poles",
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ativo")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.city}/{self.state})"


class Location(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=300, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=2, blank=True, default="")
    zip_code = models.CharField(max_length=10, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    manager = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="minicube_locations",
    )
    pole = models.ForeignKey(
        Pole, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="locations",
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Customer(models.Model):
    """Customer / Client for Jornada do Cliente.
    Central entity linking leads, sales, classes, and interactions.
    """
    TIPO_PESSOA_CHOICES = [
        ("fisica", "Pessoa Fisica"),
        ("juridica", "Pessoa Juridica"),
    ]
    STATUS_CHOICES = [
        ("ativo", "Ativo"),
        ("inativo", "Inativo"),
        ("prospect", "Prospect"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    cpf = models.CharField(max_length=14, blank=True, default="", verbose_name="CPF")
    cnpj = models.CharField(max_length=18, blank=True, default="", verbose_name="CNPJ")
    tipo_pessoa = models.CharField(
        max_length=10, choices=TIPO_PESSOA_CHOICES, default="fisica",
    )
    company = models.CharField(max_length=200, blank=True, default="")
    position = models.CharField(max_length=100, blank=True, default="")
    address = models.CharField(max_length=300, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=2, blank=True, default="")
    zip_code = models.CharField(max_length=10, blank=True, default="")
    photo_url = models.URLField(blank=True, default="")
    birth_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ativo")
    # Link to auth User (optional - for customers who also have platform access)
    user = models.OneToOneField(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="minicube_customer",
    )
    # Link to SalesCube Lead (optional - for CRM integration)
    lead = models.ForeignKey(
        "salescube.Lead", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="minicube_customers",
    )
    pole = models.ForeignKey(
        Pole, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="customers",
    )
    owner = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="owned_minicube_customers",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["cpf"]),
            models.Index(fields=["cnpj"]),
            models.Index(fields=["email"]),
            models.Index(fields=["phone"]),
        ]

    def __str__(self):
        doc = self.cpf or self.cnpj or ""
        return f"{self.name} ({doc})" if doc else self.name


class Class(models.Model):
    STATUS_CHOICES = [
        ("proxima", "Proxima"),
        ("em_andamento", "Em Andamento"),
        ("finalizada", "Finalizada"),
        ("cancelada", "Cancelada"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    product = models.ForeignKey(
        "salescube.Product", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="minicube_classes",
    )
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name="classes",
    )
    pole = models.ForeignKey(
        Pole, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="classes",
    )
    instructor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="minicube_classes",
    )
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    capacity = models.PositiveIntegerField(default=30)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="proxima")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]
        verbose_name_plural = "classes"

    def __str__(self):
        return self.name


class Enrollment(models.Model):
    """M2M through model for Student/Customer enrollment in a Class."""
    STATUS_CHOICES = [
        ("pendente", "Pendente"),
        ("confirmado", "Confirmado"),
        ("ausente", "Ausente"),
        ("sem_contato", "Sem Contato"),
        ("transferido", "Transferido"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        "Student", on_delete=models.CASCADE, related_name="enrollments",
    )
    course_class = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="enrollments",
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="enrollments",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pendente")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-enrolled_at"]
        unique_together = ["student", "course_class"]

    def __str__(self):
        return f"{self.student.name} -> {self.course_class.name} ({self.status})"


class Student(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("graduated", "Graduated"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    cpf = models.CharField(max_length=14, blank=True, default="")
    enrollment_date = models.DateField(blank=True, null=True)
    # Legacy single-class FK (kept for backward compat, nullable)
    student_class = models.ForeignKey(
        Class, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="students",
    )
    # M2M through Enrollment for multi-class support
    classes = models.ManyToManyField(
        Class, through=Enrollment, related_name="enrolled_students", blank=True,
    )
    location = models.ForeignKey(
        Location, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="students",
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="students",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Attendance(models.Model):
    """Attendance tracking per student per class session."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name="attendances",
    )
    date = models.DateField()
    present = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default="")
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="minicube_attendances",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ["enrollment", "date"]

    def __str__(self):
        status = "Present" if self.present else "Absent"
        return f"{self.enrollment.student.name} - {self.date} - {status}"


class EducationFlow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    education_class = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="flows",
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ContentBlock(models.Model):
    TYPE_CHOICES = [
        ("video", "Video"),
        ("text", "Text"),
        ("quiz", "Quiz"),
        ("task", "Task"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flow = models.ForeignKey(
        EducationFlow, on_delete=models.CASCADE, related_name="blocks",
    )
    title = models.CharField(max_length=200)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default="text")
    content = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=0)
    duration_minutes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.flow.name} > {self.title}"
